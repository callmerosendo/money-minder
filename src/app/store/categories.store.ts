import { InjectionToken, inject } from "@angular/core";
import type { SpecialsCategoryItem } from "@app/models";
import { ApiCallsService } from "@app/services";
import { addMoney } from "@app/utils";
import { patchState, signalStore, withHooks, withMethods, withState } from "@ngrx/signals";
import { firstValueFrom } from "rxjs";

type CategoriesState = {
  categories: SpecialsCategoryItem[];
};

const initialState: CategoriesState = {
  categories: [],
};

const CATEGORIES_STATE = new InjectionToken<CategoriesState>("CategoriesState", {
  factory: () => initialState,
});

export const CategoriesStore = signalStore(
  { providedIn: "root" },
  withState(() => inject(CATEGORIES_STATE)),
  withMethods((store, apiCallsService = inject(ApiCallsService)) => ({
    clearCategories(): void {
      patchState(store, { categories: initialState.categories });
    },

    async updateCategories(): Promise<void> {
      const categories = await firstValueFrom(apiCallsService.getMainCategories());
      patchState(store, { categories });
    },

    /**
     * Adds a category to the store, if the category already exists it will update the total
     * The category to add should be from the current year
     * @param category - The category to add to the store
     * @returns void - No return, updates the store
     */
    addTransactionCategory(category: SpecialsCategoryItem): void {
      const existingCategory = store
        .categories()
        .find((cat) => cat.categoryName === category.categoryName);

      if (existingCategory) {
        existingCategory.totalAmount = addMoney(existingCategory.totalAmount, category.totalAmount);
        patchState(store, { categories: [...store.categories()] });
      } else {
        patchState(store, { categories: [...store.categories(), category] });
      }
    },
  })),
  withHooks({
    async onInit(store, apiCallsService = inject(ApiCallsService)) {
      try {
        const categories = await firstValueFrom(apiCallsService.getMainCategories());
        patchState(store, { categories });
      } catch (error) {
        console.error("Error fetching categories:", error);
        patchState(store, { categories: initialState.categories });
      }
    },
  }),
);
