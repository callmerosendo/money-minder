import { HttpClient, type HttpErrorResponse } from "@angular/common/http";
import { Injectable, inject } from "@angular/core";
import { type Observable, catchError, throwError } from "rxjs";

import { API_BASE_URL } from "../constants/api";
import type {
  Account,
  ArchiveAccountResponse,
  Category,
  CreateAccountPayload,
  CreateCategoryPayload,
  CreateCreditCardPayload,
  CreateDebitCardPayload,
  CreateLoanPayload,
  CreateLoanPaymentPayload,
  CreateReminderPayload,
  CreateSavingPayload,
  CreateTransactionPayload,
  CreateTransferPayload,
  CreditCardAccount,
  DebitCard,
  DeleteCategoryResponse,
  DeleteDebitCardResponse,
  DeleteReminderResponse,
  DeleteSavingResponse,
  HardDeleteAccountResponse,
  HardDeleteTransactionResponse,
  LoanPaymentRecord,
  LoanRecord,
  Reminder,
  Saving,
  Transaction,
  TransferTransaction,
  UpdateCategoryPayload,
  UpdateLoanPaymentPayload,
  UpdateReminderPayload,
  UpdateSavingPayload,
  UpdateTransactionPayload,
} from "../models";

/**
 * Writes to the Money Minder API (v1).
 *
 * The backend derives the user from the authenticated session, so payloads no
 * longer carry `email` or `fullName`. Nest's validation pipe rejects unknown
 * properties, which is why every payload is built explicitly from the
 * interfaces declared in `API_REQUESTS.model`.
 */
@Injectable({
  providedIn: "root",
})
export class FormSubmitService {
  private readonly http = inject(HttpClient);

  private handleError(error: HttpErrorResponse): Observable<never> {
    if (error.error instanceof ErrorEvent) {
      console.error("An error occurred:", error.error.message);
    } else {
      console.error(`Backend returned code ${error.status}, body was:`, error.error);
    }
    // Keep the original HttpErrorResponse so callers can inspect status/message
    // (for example, a foreign-key violation when deleting a category).
    return throwError(() => error);
  }

  /**
   * Submits a new income, expense, or adjustment transaction.
   * @param payload - The transaction payload accepted by `POST /transactions`.
   * @returns An Observable that emits the stored transaction.
   */
  transactionSubmit(payload: CreateTransactionPayload): Observable<Transaction> {
    const url = `${API_BASE_URL}/transactions`;
    return this.http.post<Transaction>(url, payload).pipe(catchError(this.handleError));
  }

  /**
   * Corrects an existing income or expense transaction. The backend
   * recalculates its account movements atomically.
   *
   * @param id - The transaction UUID.
   * @param payload - Only the fields that changed.
   * @returns An Observable that emits the updated transaction.
   */
  transactionUpdate(id: string, payload: UpdateTransactionPayload): Observable<Transaction> {
    const url = `${API_BASE_URL}/transactions/${id}`;
    return this.http.patch<Transaction>(url, payload).pipe(catchError(this.handleError));
  }

  /**
   * Deletes a transaction.
   *
   * By default the API posts a compensating reversal; pass `hard = true` to
   * remove the ledger entry instead. Reversed transactions cannot be hard
   * deleted, which is why the UI disables their actions.
   *
   * @param id - The transaction UUID.
   * @param hard - Remove the transaction instead of reversing it.
   */
  transactionDelete(
    id: string,
    hard = false,
  ): Observable<Transaction | HardDeleteTransactionResponse> {
    const url = `${API_BASE_URL}/transactions/${id}`;
    return this.http
      .delete<Transaction | HardDeleteTransactionResponse>(url, { params: { hard } })
      .pipe(catchError(this.handleError));
  }

  /**
   * Creates a saving goal.
   */
  savingSubmit(payload: CreateSavingPayload): Observable<Saving> {
    const url = `${API_BASE_URL}/savings`;
    return this.http
      .post<Saving>(url, {
        name: payload.name,
        targetAmount: payload.targetAmount,
        currentAmount: payload.currentAmount ?? 0,
        targetDate: payload.targetDate || undefined,
      })
      .pipe(catchError(this.handleError));
  }

  /**
   * Updates a saving goal.
   */
  editSaving(id: string, payload: UpdateSavingPayload): Observable<Saving> {
    const url = `${API_BASE_URL}/savings/${id}`;
    return this.http
      .patch<Saving>(url, {
        name: payload.name,
        targetAmount: payload.targetAmount,
        currentAmount: payload.currentAmount,
        targetDate: payload.targetDate || undefined,
      })
      .pipe(catchError(this.handleError));
  }

  /**
   * Deletes a saving goal.
   * @param id - The id of the saving to delete.
   */
  deleteSaving(id: string): Observable<DeleteSavingResponse> {
    const url = `${API_BASE_URL}/savings/${id}`;
    return this.http.delete<DeleteSavingResponse>(url).pipe(catchError(this.handleError));
  }

  /**
   * Submits a new reminder.
   *
   * @param payload - The new reminder data.
   */
  reminderSubmit(payload: CreateReminderPayload): Observable<Reminder> {
    const url = `${API_BASE_URL}/reminders`;
    return this.http
      .post<Reminder>(url, {
        title: payload.title,
        amount: this.optionalAmount(payload.amount),
        dueAt: payload.dueAt,
        recurrence: payload.recurrence ?? "none",
        status: payload.status ?? "pending",
      })
      .pipe(catchError(this.handleError));
  }

  /**
   * Edits a reminder.
   *
   * @param id - The id of the reminder to edit.
   * @param payload - The data for editing the reminder.
   */
  editReminder(id: string, payload: UpdateReminderPayload): Observable<Reminder> {
    const url = `${API_BASE_URL}/reminders/${id}`;
    return this.http
      .patch<Reminder>(url, {
        title: payload.title,
        amount: this.optionalAmount(payload.amount),
        dueAt: payload.dueAt,
        recurrence: payload.recurrence,
        status: payload.status,
      })
      .pipe(catchError(this.handleError));
  }

  /**
   * Deletes a reminder.
   * @param id - The id of the reminder to delete.
   */
  deleteReminder(id: string): Observable<DeleteReminderResponse> {
    const url = `${API_BASE_URL}/reminders/${id}`;
    return this.http.delete<DeleteReminderResponse>(url).pipe(catchError(this.handleError));
  }

  /**
   * Creates a user-owned category.
   */
  createCategory(payload: CreateCategoryPayload): Observable<Category> {
    const url = `${API_BASE_URL}/categories`;
    return this.http
      .post<Category>(url, { name: payload.name, type: payload.type })
      .pipe(catchError(this.handleError));
  }

  /**
   * Renames an existing user-owned category.
   */
  updateCategory(id: string, payload: UpdateCategoryPayload): Observable<Category> {
    const url = `${API_BASE_URL}/categories/${id}`;
    return this.http
      .patch<Category>(url, {
        ...(payload.name ? { name: payload.name } : {}),
        ...(payload.type ? { type: payload.type } : {}),
      })
      .pipe(catchError(this.handleError));
  }

  /**
   * Deletes a user-owned category. Fails when transactions still reference it.
   */
  deleteCategory(id: string): Observable<DeleteCategoryResponse> {
    const url = `${API_BASE_URL}/categories/${id}`;
    return this.http.delete<DeleteCategoryResponse>(url).pipe(catchError(this.handleError));
  }

  /**
   * Creates a cash, bank, or savings account with its opening balance.
   */
  accountSubmit(payload: CreateAccountPayload): Observable<Account> {
    const url = `${API_BASE_URL}/accounts`;
    return this.http.post<Account>(url, payload).pipe(catchError(this.handleError));
  }

  /**
   * Archives an account. Its history is preserved.
   */
  archiveAccount(id: string): Observable<ArchiveAccountResponse> {
    const url = `${API_BASE_URL}/accounts/${id}/archive`;
    return this.http.post<ArchiveAccountResponse>(url, {}).pipe(catchError(this.handleError));
  }

  /**
   * Moves money between two accounts. Credit cards may only be the destination.
   */
  transferSubmit(payload: CreateTransferPayload): Observable<TransferTransaction> {
    const url = `${API_BASE_URL}/transfers`;
    return this.http.post<TransferTransaction>(url, payload).pipe(catchError(this.handleError));
  }

  /**
   * Links a debit card to an owned bank account.
   */
  debitCardSubmit(payload: CreateDebitCardPayload): Observable<DebitCard> {
    const url = `${API_BASE_URL}/debit-cards`;
    return this.http.post<DebitCard>(url, payload).pipe(catchError(this.handleError));
  }

  /**
   * Deletes a debit card's metadata. The linked account is not modified.
   */
  deleteDebitCard(id: string): Observable<DeleteDebitCardResponse> {
    const url = `${API_BASE_URL}/debit-cards/${id}`;
    return this.http.delete<DeleteDebitCardResponse>(url).pipe(catchError(this.handleError));
  }

  creditCardSubmit(payload: CreateCreditCardPayload): Observable<CreditCardAccount> {
    const url = `${API_BASE_URL}/credit-cards`;
    return this.http.post<CreditCardAccount>(url, payload).pipe(catchError(this.handleError));
  }

  deleteCreditCard(id: string): Observable<ArchiveAccountResponse | HardDeleteAccountResponse> {
    const url = `${API_BASE_URL}/credit-cards/${id}`;
    return this.http
      .delete<ArchiveAccountResponse | HardDeleteAccountResponse>(url)
      .pipe(catchError(this.handleError));
  }

  addLoan(payload: CreateLoanPayload): Observable<LoanRecord> {
    const url = `${API_BASE_URL}/loans`;
    return this.http.post<LoanRecord>(url, payload).pipe(catchError(this.handleError));
  }

  addPayment(loanId: string, payload: CreateLoanPaymentPayload): Observable<LoanPaymentRecord> {
    const url = `${API_BASE_URL}/loans/${loanId}/payments`;
    return this.http.post<LoanPaymentRecord>(url, payload).pipe(catchError(this.handleError));
  }

  editPayment(
    loanId: string,
    paymentId: string,
    payload: UpdateLoanPaymentPayload,
  ): Observable<LoanPaymentRecord> {
    const url = `${API_BASE_URL}/loans/${loanId}/payments/${paymentId}`;
    return this.http.patch<LoanPaymentRecord>(url, payload).pipe(catchError(this.handleError));
  }

  /**
   * Normalizes an optional money field coming from a form control, which may
   * hand back `null` when the input is cleared.
   */
  private optionalAmount(value: unknown): number | undefined {
    if (value === null || value === undefined || value === "") return undefined;

    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
}
