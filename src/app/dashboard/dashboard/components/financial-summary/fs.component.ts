import { CurrencyPipe } from "@angular/common";
import { Component, computed, inject } from "@angular/core";
import { FinancialSummaryStore } from "@app/store";
import { subtractMoney } from "@app/utils";

@Component({
  selector: "app-financial-summary",
  templateUrl: "./fs.component.html",
  imports: [CurrencyPipe],
})
export class FinancialSummaryComponent {
  private readonly store = inject(FinancialSummaryStore);
  financialSummary = this.store.financialSummary;
  balance = computed(() =>
    subtractMoney(this.financialSummary().totalEntries, this.financialSummary().totalExits),
  );
  hasData = computed(
    () =>
      this.financialSummary().totalEntries !== "0.00" ||
      this.financialSummary().totalExits !== "0.00",
  );
}
