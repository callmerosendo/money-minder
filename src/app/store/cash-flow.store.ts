import { InjectionToken, inject } from "@angular/core";
import type { LegacyCashFlowItem } from "@app/models";
import { ApiCallsService } from "@app/services";
import { patchState, signalStore, withHooks, withMethods, withState } from "@ngrx/signals";
import { firstValueFrom } from "rxjs";

type CashFlowState = {
  cashFlow: LegacyCashFlowItem[];
};

const initialState: CashFlowState = {
  cashFlow: [],
};

const CASH_FLOW_STATE = new InjectionToken<CashFlowState>("CashFlowState", {
  factory: () => initialState,
});

export const CashFlowStore = signalStore(
  { providedIn: "root" },
  withState(() => inject(CASH_FLOW_STATE)),
  withMethods((store, apiCallsService = inject(ApiCallsService)) => ({
    clearCashFlow(): void {
      patchState(store, { cashFlow: initialState.cashFlow });
    },

    async updateCashFlow(): Promise<void> {
      const cashFlow = await firstValueFrom(apiCallsService.getCashFlow());
      patchState(store, { cashFlow });
    },
  })),
  withHooks({
    async onInit(store, apiCallsService = inject(ApiCallsService)) {
      try {
        const cashFlow = await firstValueFrom(apiCallsService.getCashFlow());
        patchState(store, { cashFlow });
      } catch (error) {
        console.error("Error fetching cash flow:", error);
        patchState(store, { cashFlow: initialState.cashFlow });
      }
    },
  }),
);
