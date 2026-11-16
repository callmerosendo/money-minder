import { InjectionToken, inject } from "@angular/core";
import type { LegacyCashFlowItem, MoneyInput } from "@app/models";
import { ApiCallsService } from "@app/services";
import { addMoney, subtractMoney } from "@app/utils";
import { patchState, signalStore, withHooks, withMethods, withState } from "@ngrx/signals";
import { firstValueFrom } from "rxjs";
import {
  addNewTransaction,
  findTransactionIndex,
  isValidMonth,
  updateExistingTransaction,
} from "./cash-flow.utils";

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

    addEntryTransaction(month: string, amount: MoneyInput): void {
      if (!isValidMonth(month)) {
        throw new Error("Invalid month format. Month should be a string in MM format.");
      }

      const cashFlow = store.cashFlow();
      const existingTransactionIndex = findTransactionIndex(cashFlow, month);

      if (existingTransactionIndex !== -1) {
        const existingTransaction = cashFlow[existingTransactionIndex];
        updateExistingTransaction(cashFlow, existingTransactionIndex, {
          ...existingTransaction,
          total_ingresos: addMoney(existingTransaction.total_ingresos, amount),
          balance: addMoney(existingTransaction.balance, amount),
        });
      } else {
        addNewTransaction(cashFlow, {
          month,
          total_ingresos: addMoney(amount),
          total_egresos: "0.00",
          total_fees: "0.00",
          balance: addMoney(amount),
        });
      }

      patchState(store, { cashFlow });
    },

    addExitTransaction(month: string, amount: MoneyInput): void {
      if (!isValidMonth(month)) {
        throw new Error("Invalid month format. Month should be a string in MM format.");
      }

      const cashFlow = store.cashFlow();
      const existingTransactionIndex = findTransactionIndex(cashFlow, month);

      if (existingTransactionIndex !== -1) {
        const existingTransaction = cashFlow[existingTransactionIndex];
        updateExistingTransaction(cashFlow, existingTransactionIndex, {
          ...existingTransaction,
          total_egresos: addMoney(existingTransaction.total_egresos, amount),
          balance: subtractMoney(existingTransaction.balance, amount),
        });
      } else {
        addNewTransaction(cashFlow, {
          month,
          total_ingresos: "0.00",
          total_egresos: addMoney(amount),
          total_fees: "0.00",
          balance: subtractMoney("0.00", amount),
        });
      }

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
