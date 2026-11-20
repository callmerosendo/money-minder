import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  computed,
  inject,
  signal,
} from "@angular/core";
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from "@angular/forms";
import { Title } from "@angular/platform-browser";

import { ThemeToggleComponent } from "@app/core";
import type { Category, CategoryType } from "@app/models";
import { AlertService } from "@app/services";
import { TransactionCategoriesStore } from "@app/store";

@Component({
  selector: "app-settings",
  templateUrl: "./settings.component.html",
  imports: [ReactiveFormsModule, ThemeToggleComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class SettingsComponent {
  private readonly title = inject(Title);
  readonly store = inject(TransactionCategoriesStore);
  readonly alertService = inject(AlertService);

  readonly activeType = signal<CategoryType>("expense");
  readonly editingCategory = signal<Category | null>(null);
  readonly deleteTarget = signal<Category | null>(null);

  readonly addForm = new FormGroup({
    name: new FormControl("", {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(100)],
    }),
  });

  readonly renameControl = new FormControl("", {
    nonNullable: true,
    validators: [Validators.required, Validators.maxLength(100)],
  });

  readonly categoriesForType = computed(() =>
    this.store.categories().filter((category) => category.type === this.activeType()),
  );

  readonly activeTypeLabel = computed(() =>
    this.activeType() === "expense" ? "gastos" : "ingresos",
  );

  constructor() {
    this.title.setTitle("Ajustes | Money Minder");
  }

  setActiveType(type: CategoryType): void {
    if (this.activeType() === type) return;
    this.activeType.set(type);
    this.cancelRename();
  }

  async addCategory(): Promise<void> {
    const name = this.addForm.controls.name.value.trim();
    const type = this.activeType();

    if (!name) {
      this.showWarning("Agrega un nombre para la categoría.");
      return;
    }

    const alreadyExists = this.store
      .categories()
      .some(
        (category) =>
          category.type === type && category.name.trim().toLowerCase() === name.toLowerCase(),
      );

    if (alreadyExists) {
      this.showWarning("Ya existe una categoría con ese nombre para este tipo.");
      return;
    }

    const created = await this.store.createCategory({ name, type });

    if (!created) {
      this.showError(this.store.error() ?? "No se pudo crear la categoría.", "create");
      return;
    }

    this.addForm.reset({ name: "" });
    this.alertService.showSuccess({ feature: "category", action: "create" });
  }

  startRename(category: Category): void {
    if (!category.user_id) return;

    this.editingCategory.set(category);
    this.renameControl.setValue(category.name);
  }

  cancelRename(): void {
    this.editingCategory.set(null);
    this.renameControl.reset("");
  }

  async saveRename(event?: Event): Promise<void> {
    // The rename form has no formGroup, so Angular does not cancel the native
    // submit; without this the browser would reload the page.
    event?.preventDefault();

    const category = this.editingCategory();
    if (!category) return;

    const name = this.renameControl.value.trim();

    if (!name) {
      this.showWarning("Agrega un nombre para la categoría.");
      return;
    }

    if (name === category.name) {
      this.cancelRename();
      return;
    }

    const updated = await this.store.updateCategory(category.id, { name });

    if (!updated) {
      this.showError(this.store.error() ?? "No se pudo actualizar la categoría.", "update");
      return;
    }

    this.cancelRename();
    this.alertService.showSuccess({ feature: "category", action: "update" });
  }

  openDelete(category: Category): void {
    if (!category.user_id) return;
    this.deleteTarget.set(category);
  }

  closeDelete(): void {
    this.deleteTarget.set(null);
  }

  async confirmDelete(event?: Event): Promise<void> {
    // Same as the rename form: stop the browser's native form submission.
    event?.preventDefault();

    const category = this.deleteTarget();
    if (!category) return;

    const deleted = await this.store.deleteCategory(category.id);
    this.closeDelete();

    if (deleted) {
      this.alertService.showSuccess({ feature: "category", action: "delete" });
      return;
    }

    this.showError(this.store.error() ?? "No se pudo eliminar la categoría.", "delete");
  }

  async importDefaults(): Promise<void> {
    const created = await this.store.seedDefaultCategories();
    const error = this.store.error();

    if (error) {
      this.showError(error, "create");
      return;
    }

    if (created > 0) {
      this.alertService.showSuccess({
        feature: "category",
        action: "create",
        customMessage: `Se importaron ${created} categorías predeterminadas.`,
      });
      return;
    }

    this.alertService.showInfo({
      feature: "category",
      action: "create",
      customMessage: "Las categorías predeterminadas ya existen.",
    });
  }

  reload(): void {
    void this.store.loadCategories();
  }

  @HostListener("document:keydown.escape")
  onEscape(): void {
    if (this.deleteTarget()) {
      this.closeDelete();
      return;
    }

    if (this.editingCategory()) this.cancelRename();
  }

  private showWarning(message: string): void {
    this.alertService.showWarning({
      feature: "category",
      action: "create",
      customMessage: message,
    });
  }

  private showError(message: string, action: "create" | "update" | "delete" = "create"): void {
    this.alertService.showError({ feature: "category", action, customMessage: message });
  }
}
