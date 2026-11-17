import { InjectionToken, inject } from "@angular/core";
import type { CreateLoanPaymentPayload, LoanListItem, UpdateLoanPaymentPayload } from "@app/models";
import { ApiCallsService } from "@app/services";
import { patchState, signalStore, withHooks, withMethods, withState } from "@ngrx/signals";
import { firstValueFrom } from "rxjs";
import { addNewPayment, calculatePaymentDifference, updateSpecificPayment } from "./loans.utils";

type LoansState = {
  loans: LoanListItem[];
};

const initialState: LoansState = {
  loans: [],
};

const LOANS_STATE = new InjectionToken<LoansState>("LoansState", {
  factory: () => initialState,
});

export const LoansStore = signalStore(
  { providedIn: "root" },
  withState(() => inject(LOANS_STATE)),
  withMethods((store, apiCallsService = inject(ApiCallsService)) => ({
    clearLoans(): void {
      patchState(store, { loans: initialState.loans });
    },

    async updateLoans(): Promise<void> {
      const loans = await firstValueFrom(apiCallsService.getLoans());
      patchState(store, { loans });
    },

    addLoan(newLoan: LoanListItem): void {
      patchState(store, {
        loans: [newLoan, ...store.loans()],
      });
    },

    updatePayment(loanId: string, paymentId: string, payment: UpdateLoanPaymentPayload): void {
      patchState(store, {
        loans: store.loans().map((loan) => {
          if (loan.id !== loanId) return loan;

          const originalPayment = loan.lastFivePayments.find((item) => item.id === paymentId);

          if (!originalPayment) return loan;

          const nextAmount = payment.amount ?? originalPayment.amount;
          const difference = calculatePaymentDifference(originalPayment.amount, nextAmount);
          const totalPaid = loan.totalPaid + difference;

          return {
            ...loan,
            lastFivePayments: updateSpecificPayment(loan.lastFivePayments, paymentId, payment),
            totalPaid,
            remaining: Math.max(0, loan.principal - totalPaid),
          };
        }),
      });
    },

    addPayment(loanId: string, payment: CreateLoanPaymentPayload): void {
      patchState(store, {
        loans: store.loans().map((loan) => {
          if (loan.id !== loanId) return loan;

          const totalPaid = loan.totalPaid + payment.amount;

          return {
            ...loan,
            lastFivePayments: addNewPayment(loan.lastFivePayments, payment),
            totalPaid,
            remaining: Math.max(0, loan.principal - totalPaid),
          };
        }),
      });
    },
  })),
  withHooks({
    async onInit(store, apiCallsService = inject(ApiCallsService)) {
      try {
        const loans = await firstValueFrom(apiCallsService.getLoans());
        patchState(store, { loans });
      } catch (error) {
        console.error("Error fetching Loans:", error);
        patchState(store, { loans: initialState.loans });
      }
    },
  }),
);
