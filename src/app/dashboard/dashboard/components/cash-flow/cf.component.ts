import { Component, computed, inject } from "@angular/core";

import { ChartComponent, toCashFlowBarSpec } from "@app/charts";
import { CashFlowStore } from "@app/store";

@Component({
  selector: "app-cash-flow",
  imports: [ChartComponent],
  templateUrl: "./cf.component.html",
})
export class CashFlowComponent {
  readonly store = inject(CashFlowStore);
  cashFlow = this.store.cashFlow;

  cashFlowSpec = computed(() => toCashFlowBarSpec(this.cashFlow()));
}
