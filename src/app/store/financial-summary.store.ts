import { InjectionToken, inject } from "@angular/core";
import type { SpecialsFinancialSummaryYearly } from "@app/models";
import { ApiCallsService } from "@app/services";
import { isBrowserPlatform } from "@app/utils";
import { patchState, signalStore, withHooks, withMethods, withState } from "@ngrx/signals";
import { firstValueFrom } from "rxjs";

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
  })),
  withHooks({
    async onInit(store, apiCallsService = inject(ApiCallsService)) {
      if (!isBrowserPlatform()) return;

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
