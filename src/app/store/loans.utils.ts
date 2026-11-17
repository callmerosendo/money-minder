import type {
  CreateLoanPaymentPayload,
  LoanPaymentHistoryItem,
  UpdateLoanPaymentPayload,
} from "@app/models";

/**
 * Updates a specific payment within a list of payments.
 * @param payments The array of payments to update.
 * @param paymentId The id of the payment to update.
 * @param payment The payment details to update. Omitted fields are kept.
 * @returns A new array of payments with the updated payment.
 */
export const updateSpecificPayment = (
  payments: LoanPaymentHistoryItem[],
  paymentId: string,
  payment: UpdateLoanPaymentPayload,
): LoanPaymentHistoryItem[] => {
  return payments.map((item) =>
    item.id === paymentId
      ? {
          ...item,
          amount: payment.amount ?? item.amount,
          paidAt: payment.paidAt ?? item.paidAt,
          note: payment.note ?? item.note,
        }
      : item,
  );
};

/**
 * Calculates the difference between two payment amounts.
 * @param originalAmount The original payment amount.
 * @param newAmount The new payment amount.
 * @returns The difference between the new and original amounts.
 */
export const calculatePaymentDifference = (originalAmount: number, newAmount: number): number => {
  return newAmount - originalAmount;
};

/**
 * Adds a new payment to a list of payments.
 * @param payments The array of payments to update.
 * @param newPayment The payment details to add.
 * @returns A new array of payments with the added payment.
 */
export const addNewPayment = (
  payments: LoanPaymentHistoryItem[],
  newPayment: CreateLoanPaymentPayload,
): LoanPaymentHistoryItem[] => {
  const newPaymentEntry: LoanPaymentHistoryItem = {
    id: `pending-${Date.now()}`,
    amount: newPayment.amount,
    paidAt: newPayment.paidAt ?? new Date().toISOString(),
    note: newPayment.note ?? null,
  };

  // Add the new payment and keep only the latest five.
  const updatedPayments = [newPaymentEntry, ...payments];
  if (updatedPayments.length > 5) updatedPayments.pop();

  return updatedPayments;
};
