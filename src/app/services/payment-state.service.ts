import { Injectable, inject, signal } from "@angular/core";
import { FormSubmitService } from "@app/services";
import type { CreateLoanPaymentPayload, UpdateLoanPaymentPayload } from "@app/models";

@Injectable()
export class PaymentStateService {
  private submitService = inject(FormSubmitService);
  readonly editingPaymentId = signal<string | null>(null);

  addPayment(loanId: string, paymentData: CreateLoanPaymentPayload) {
    return this.submitService.addPayment(loanId, paymentData);
  }

  editPayment(loanId: string, paymentId: string, editData: UpdateLoanPaymentPayload) {
    return this.submitService.editPayment(loanId, paymentId, editData);
  }

  toggleEditMode(paymentId: string): void {
    this.editingPaymentId.set(paymentId === this.editingPaymentId() ? null : paymentId);
  }

  cancelEdit(): void {
    this.editingPaymentId.set(null);
  }
}
