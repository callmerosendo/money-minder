import { Injectable, inject } from "@angular/core";
import { LoansStore } from "@app/store";
import type { CreateLoanPaymentPayload, LoanListItem, UpdateLoanPaymentPayload } from "@app/models";

@Injectable()
export class LoansStateService {
  private store = inject(LoansStore);

  get loans() {
    return this.store.loans;
  }

  addLoan(newLoan: LoanListItem): void {
    this.store.addLoan(newLoan);
  }

  updateLoans(): void {
    this.store.updateLoans();
  }

  addPayment(loanId: string, paymentData: CreateLoanPaymentPayload): void {
    this.store.addPayment(loanId, paymentData);
  }

  updatePayment(loanId: string, paymentId: string, editData: UpdateLoanPaymentPayload): void {
    this.store.updatePayment(loanId, paymentId, editData);
  }
}
