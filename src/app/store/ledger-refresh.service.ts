import { Injectable, inject } from "@angular/core";

import { AccountsStore } from "./accounts.store";
import { CashFlowStore } from "./cash-flow.store";
import { CategoriesStore } from "./categories.store";
import { CreditCardsStore } from "./credit-cards.store";
import { FinancialSummaryStore } from "./financial-summary.store";
import { TransactionsStore } from "./transactions.store";

/**
 * Reloads every server-derived view after a ledger mutation (create, edit or
 * delete). The API calculates balances, summaries and chart aggregates, so
 * refetching is safer than trying to mirror those calculations in each store.
 */
@Injectable({ providedIn: "root" })
export class LedgerRefreshService {
  private readonly transactionsStore = inject(TransactionsStore);
  private readonly accountsStore = inject(AccountsStore);
  private readonly creditCardsStore = inject(CreditCardsStore);
  private readonly financialSummaryStore = inject(FinancialSummaryStore);
  private readonly cashFlowStore = inject(CashFlowStore);
  private readonly categoriesStore = inject(CategoriesStore);

  async refreshAll(): Promise<void> {
    const results = await Promise.allSettled([
      this.transactionsStore.refresh(),
      this.accountsStore.refresh(),
      this.creditCardsStore.refresh(),
      this.financialSummaryStore.updateFinancialSummary(),
      this.cashFlowStore.updateCashFlow(),
      this.categoriesStore.updateCategories(),
    ]);

    for (const result of results) {
      if (result.status === "rejected") {
        console.error("Error refreshing ledger data:", result.reason);
      }
    }
  }
}
