import { Component, computed, inject } from "@angular/core";

import { ChartComponent, toCategoryPieSpec } from "@app/charts";
import { CategoriesStore } from "@app/store";

@Component({
  selector: "app-main-categories",
  templateUrl: "./mc.component.html",
  imports: [ChartComponent],
})
export class MainCategoriesComponent {
  readonly store = inject(CategoriesStore);
  categories = this.store.categories;

  categoriesSpec = computed(() => toCategoryPieSpec(this.categories(), "Categorías principales"));
}
