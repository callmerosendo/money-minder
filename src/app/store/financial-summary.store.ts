import { InjectionToken, inject } from "@angular/core";
import type { MoneyInput, SpecialsFinancialSummaryYearly } from "@app/models";
import { ApiCallsService } from "@app/services";
import { patchState, signalStore, withHooks, withMethods, withState } from "@ngrx/signals";
import { firstValueFrom } from "rxjs";
import { addMoney, subtractMoney } from "@app/utils";

type FinancialSummaryState = {
  financialSummary: SpecialsFinancialSummaryYearly;
};

const buildInitialState = (): FinancialSummaryState => ({
  financialSummary: {
    year: new Date().getFullYear(),
    totalEntries: "0.00",
    totalExits: "0.00",
    netBalance: "0.00",
  },
});

const initialState = buildInitialState();

const FINANCIAL_SUMMARY_STATE = new InjectionToken<FinancialSummaryState>("FinancialSummaryState", {
  factory: () => buildInitialState(),
});

export const FinancialSummaryStore = signalStore(
  { providedIn: "root" },
  withState(() => inject(FINANCIAL_SUMMARY_STATE)),
  withMethods((store, apiCallsService = inject(ApiCallsService)) => ({
    deleteFinancialSummary(): void {
      patchState(store, { financialSummary: initialState.financialSummary });
    },

    async updateFinancialSummary(): Promise<void> {
      const financialSummary = await firstValueFrom(apiCallsService.getFinancialSummary());
      patchState(store, { financialSummary });
    },

    /**
     * Adds an entry to the total entries, it should be from the current year
     * @param entry - The amount to add to the total entries
     * @returns void - No return, updates the store
     */
    addSummaryEntry(entry: MoneyInput): void {
      const current = store.financialSummary();
      const totalEntries = addMoney(current.totalEntries, entry);

      patchState(store, {
        financialSummary: {
          ...current,
          totalEntries,
          netBalance: subtractMoney(totalEntries, current.totalExits),
        },
      });
    },

    /**
     * Adds an exit to the total exits, it should be from the current year
     * @param exit - The amount to add to the total exits
     * @returns void - No return, updates the store
     */
    addSummaryExit(exit: MoneyInput): void {
      const current = store.financialSummary();
      const totalExits = addMoney(current.totalExits, exit);

      patchState(store, {
        financialSummary: {
          ...current,
          totalExits,
          netBalance: subtractMoney(current.totalEntries, totalExits),
        },
      });
    },
  })),
  withHooks({
    async onInit(store, apiCallsService = inject(ApiCallsService)) {
      try {
        const financialSummary = await firstValueFrom(apiCallsService.getFinancialSummary());
        patchState(store, { financialSummary });
      } catch (error) {
        console.error("Error fetching financial summary:", error);
        patchState(store, { financialSummary: initialState.financialSummary });
      }
    },
  }),
);
