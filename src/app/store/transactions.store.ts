import { InjectionToken, inject } from "@angular/core";
import type { SpecialsRecentTransactionItem, Transaction } from "@app/models";
import { ApiCallsService } from "@app/services";
import { patchState, signalStore, withHooks, withMethods, withState } from "@ngrx/signals";
import { firstValueFrom } from "rxjs";

/** Cap kept per list so a long-running session never grows unbounded. */
const MAX_TRANSACTIONS = 30;
const MAX_RECENT = 8;

type TransactionState = {
  transactions: Transaction[];
  recentTransactions: SpecialsRecentTransactionItem[];
};

const initialState: TransactionState = {
  transactions: [],
  recentTransactions: [],
};

const TRANSACTION_STATE = new InjectionToken<TransactionState>("TransactionState", {
  factory: () => initialState,
});

export const TransactionsStore = signalStore(
  { providedIn: "root" },
  withState(() => inject(TRANSACTION_STATE)),
  withMethods((store, apiCallsService = inject(ApiCallsService)) => ({
    /**
     * Reloads the dashboard lists after a ledger mutation.
     */
    async refresh(): Promise<void> {
      const [recentTransactions, entries, exits] = await Promise.all([
        firstValueFrom(apiCallsService.getRecentTransactions()),
        firstValueFrom(apiCallsService.getLastEntries()),
        firstValueFrom(apiCallsService.getLastExits()),
      ]);

      patchState(store, {
        recentTransactions,
        transactions: [...entries, ...exits].slice(0, MAX_TRANSACTIONS),
      });
    },

    addRecentTransaction(transaction: SpecialsRecentTransactionItem): void {
      const updatedTransactions = [transaction, ...store.recentTransactions()];
      if (updatedTransactions.length > MAX_RECENT) {
        updatedTransactions.pop();
      }
      patchState(store, { recentTransactions: updatedTransactions });
    },

    /** Prepends a freshly stored transaction to the table list. */
    addTransaction(transaction: Transaction): void {
      const updatedTransactions = [transaction, ...store.transactions()];
      if (updatedTransactions.length > MAX_TRANSACTIONS) {
        updatedTransactions.pop();
      }
      patchState(store, { transactions: updatedTransactions });
    },
  })),
  withHooks({
    async onInit(store, apiCallsService = inject(ApiCallsService)) {
      try {
        const [recentTransactions, entries, exits] = await Promise.all([
          firstValueFrom(apiCallsService.getRecentTransactions()),
          firstValueFrom(apiCallsService.getLastEntries()),
          firstValueFrom(apiCallsService.getLastExits()),
        ]);

        patchState(store, {
          recentTransactions,
          transactions: [...entries, ...exits].slice(0, MAX_TRANSACTIONS),
        });
      } catch (error) {
        console.error("Error fetching recent transactions:", error);
        patchState(store, initialState);
      }
    },
  }),
);
