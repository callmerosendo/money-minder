import { HttpErrorResponse } from "@angular/common/http";
import { InjectionToken, inject } from "@angular/core";
import type {
  Category,
  CategoryType,
  CreateCategoryPayload,
  UpdateCategoryPayload,
} from "@app/models";
import { ApiCallsService, FormSubmitService } from "@app/services";
import { isBrowserPlatform } from "@app/utils";
import { extractApiErrorMessage } from "@app/utils";
import { patchState, signalStore, withHooks, withMethods, withState } from "@ngrx/signals";
import { firstValueFrom } from "rxjs";

import defaultCategoriesJson from "../constants/default-categories.json";

type TransactionCategoriesState = {
  categories: Category[];
  isLoading: boolean;
  isSaving: boolean;
  isSeeding: boolean;
  error: string | null;
};

const initialState: TransactionCategoriesState = {
  categories: [],
  isLoading: true,
  isSaving: false,
  isSeeding: false,
  error: null,
};

/** Default categories are grouped by their Spanish labels in the JSON file. */
const defaultCategoriesByGroup = defaultCategoriesJson as Record<string, string[]>;

const DEFAULT_CATEGORY_GROUPS: ReadonlyArray<{ group: string; type: CategoryType }> = [
  { group: "Egreso", type: "expense" },
  { group: "Ingreso", type: "income" },
];

const CATEGORY_IN_USE_MESSAGE = "Esta categoría tiene transacciones y no se puede eliminar.";

const sortCategories = (categories: Category[]): Category[] =>
  [...categories].sort((a, b) => a.name.localeCompare(b.name, "es"));

const isCategoryInUseError = (error: unknown): boolean => {
  if (!(error instanceof HttpErrorResponse)) return false;

  const message = extractApiErrorMessage(error, "");
  return error.status === 409 || (error.status === 400 && /foreign key/i.test(message));
};

const categoriesState = new InjectionToken<TransactionCategoriesState>(
  "TransactionCategoriesState",
  {
    factory: () => initialState,
  },
);

/**
 * Global plus user-owned categories used by the transaction form and settings.
 * Kept separate from `CategoriesStore`, which holds chart aggregates.
 */
export const TransactionCategoriesStore = signalStore(
  { providedIn: "root" },
  withState(() => inject(categoriesState)),
  withMethods(
    (
      store,
      apiCallsService = inject(ApiCallsService),
      formSubmitService = inject(FormSubmitService),
    ) => ({
      clearCategories(): void {
        patchState(store, {
          categories: initialState.categories,
          isLoading: false,
          isSaving: false,
          isSeeding: false,
          error: null,
        });
      },

      /** Reloads every category from the API. */
      async loadCategories(): Promise<void> {
        patchState(store, { isLoading: true, error: null });

        try {
          const categories = await firstValueFrom(apiCallsService.getCategories());
          patchState(store, { categories: sortCategories(categories), isLoading: false });
        } catch (error) {
          console.error("Error fetching transaction categories:", error);
          patchState(store, {
            isLoading: false,
            error: extractApiErrorMessage(error, "No se pudieron obtener las categorías."),
          });
        }
      },

      /** Creates a category and appends it to the current signal state. */
      async createCategory(payload: CreateCategoryPayload): Promise<Category | null> {
        patchState(store, { isSaving: true, error: null });

        try {
          const category = await firstValueFrom(formSubmitService.createCategory(payload));
          patchState(store, {
            categories: sortCategories([...store.categories(), category]),
            isSaving: false,
          });
          return category;
        } catch (error) {
          console.error("Error creating category:", error);
          patchState(store, {
            isSaving: false,
            error: extractApiErrorMessage(error, "No se pudo crear la categoría."),
          });
          return null;
        }
      },

      /** Renames (or changes the type of) a category and keeps the list in sync. */
      async updateCategory(id: string, payload: UpdateCategoryPayload): Promise<Category | null> {
        patchState(store, { isSaving: true, error: null });

        try {
          const updated = await firstValueFrom(formSubmitService.updateCategory(id, payload));
          patchState(store, {
            categories: sortCategories(
              store.categories().map((category) => (category.id === id ? updated : category)),
            ),
            isSaving: false,
          });
          return updated;
        } catch (error) {
          console.error("Error updating category:", error);
          patchState(store, {
            isSaving: false,
            error: extractApiErrorMessage(error, "No se pudo actualizar la categoría."),
          });
          return null;
        }
      },

      /**
       * Deletes a category. Returns `false` when the API rejects the delete,
       * including when existing transactions reference the category.
       */
      async deleteCategory(id: string): Promise<boolean> {
        patchState(store, { isSaving: true, error: null });

        try {
          await firstValueFrom(formSubmitService.deleteCategory(id));
          patchState(store, {
            categories: store.categories().filter((category) => category.id !== id),
            isSaving: false,
          });
          return true;
        } catch (error) {
          console.error("Error deleting category:", error);
          patchState(store, {
            isSaving: false,
            // The backend maps Prisma P2003 to 400 "Foreign key constraint failed".
            error: isCategoryInUseError(error)
              ? CATEGORY_IN_USE_MESSAGE
              : "No se pudo eliminar la categoría.",
          });
          return false;
        }
      },

      /**
       * Creates the default categories that do not already exist for their type.
       * Returns how many categories were created.
       */
      async seedDefaultCategories(): Promise<number> {
        patchState(store, { isSeeding: true, error: null });
        let createdCount = 0;

        try {
          const existing = await firstValueFrom(apiCallsService.getCategories());
          let categories = sortCategories(existing);
          patchState(store, { categories });

          for (const { group, type } of DEFAULT_CATEGORY_GROUPS) {
            const names = defaultCategoriesByGroup[group] ?? [];

            for (const rawName of names) {
              const name = rawName.trim();
              if (!name) continue;

              const alreadyExists = categories.some(
                (category) =>
                  category.type === type &&
                  category.name.trim().toLowerCase() === name.toLowerCase(),
              );
              if (alreadyExists) continue;

              const created = await firstValueFrom(
                formSubmitService.createCategory({ name, type }),
              );
              categories = sortCategories([...categories, created]);
              patchState(store, { categories });
              createdCount++;
            }
          }

          patchState(store, { isSeeding: false });
          return createdCount;
        } catch (error) {
          console.error("Error seeding default categories:", error);
          patchState(store, {
            isSeeding: false,
            error: extractApiErrorMessage(
              error,
              "No se pudieron importar las categorías predeterminadas.",
            ),
          });
          return createdCount;
        }
      },
    }),
  ),
  withHooks({
    async onInit(store, apiCallsService = inject(ApiCallsService)) {
      if (!isBrowserPlatform()) return;

      try {
        const categories = await firstValueFrom(apiCallsService.getCategories());
        patchState(store, { categories: sortCategories(categories), isLoading: false });
      } catch (error) {
        console.error("Error fetching transaction categories:", error);
        patchState(store, {
          categories: initialState.categories,
          isLoading: false,
          error: extractApiErrorMessage(error, "No se pudieron obtener las categorías."),
        });
      }
    },
  }),
);
