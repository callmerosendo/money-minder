import { HttpClient, HttpParams } from "@angular/common/http";
import { Injectable, inject } from "@angular/core";
import { type Observable, catchError, map, throwError } from "rxjs";

import {
  categoryTotalsAdapter,
  paginatedTransfersAdapter,
  yearlyCategoriesAdapter,
} from "../adapters";
import { API_BASE_URL } from "../constants/api";
import type {
  Account,
  Category,
  CreditCardAccount,
  CreditCardPurchasesSummary,
  DailyPhraseResponse,
  DebitCard,
  ExpenseCategoryBreakdownItem,
  GetCategoriesQuery,
  GetTransactionsQuery,
  LegacyCashFlowItem,
  LoanListItem,
  MonthlyReportResponse,
  PaginatedResponse,
  Reminder,
  Saving,
  SpecialsCategoryItem,
  SpecialsFinancialSummaryYearly,
  SpecialsRecentTransactionItem,
  SpecialsYearlyCategoriesResponse,
  Transaction,
  Transfer,
  TransferTransaction,
} from "../models";

/** Query values that should be omitted from the URL entirely. */
const isBlank = (value: unknown): boolean => value === undefined || value === null || value === "";

/** Inclusive `[from, to]` date-only bounds covering a whole calendar month. */
const monthRange = (year: number, month: string): { from: string; to: string } => {
  const monthNumber = Number(month);
  const lastDay = new Date(year, monthNumber, 0).getDate();
  const paddedMonth = month.padStart(2, "0");

  return {
    from: `${year}-${paddedMonth}-01`,
    to: `${year}-${paddedMonth}-${String(lastDay).padStart(2, "0")}`,
  };
};

@Injectable({
  providedIn: "root",
})
export class ApiCallsService {
  private readonly http = inject(HttpClient);
  private readonly year = new Date().getFullYear();

  /**
   * Retrieves the financial summary for a specific year.
   * @returns An Observable that emits the financial summary data.
   */
  getFinancialSummary(): Observable<SpecialsFinancialSummaryYearly> {
    const url = `${API_BASE_URL}/specials/financial-summary-yearly?year=${this.year}`;
    return this.http
      .get<SpecialsFinancialSummaryYearly>(url)
      .pipe(catchError((error) => this.handleError("Financial Summary", error)));
  }

  /**
   * Retrieves the recent transactions.
   * @returns An Observable that emits the recent transactions data.
   */
  getRecentTransactions(): Observable<SpecialsRecentTransactionItem[]> {
    const url = `${API_BASE_URL}/specials/recent-transactions?year=${this.year}`;
    return this.http
      .get<SpecialsRecentTransactionItem[]>(url)
      .pipe(catchError((error) => this.handleError("Recent Transactions", error)));
  }

  /**
   * Retrieves the cash flow data.
   * @returns An Observable of type LegacyCashFlowItem[] representing the cash flow data.
   */
  getCashFlow(): Observable<LegacyCashFlowItem[]> {
    const url = `${API_BASE_URL}/specials/cash-flow?year=${this.year}`;
    return this.http
      .get<LegacyCashFlowItem[]>(url)
      .pipe(catchError((error) => this.handleError("Cash Flow", error)));
  }

  /**
   * Retrieves the yearly main categories.
   * @returns An Observable of type SpecialsCategoryItem[] representing the main categories.
   */
  getMainCategories(): Observable<SpecialsCategoryItem[]> {
    const url = `${API_BASE_URL}/specials/yearly-categories?year=${this.year}`;
    return this.http.get<SpecialsYearlyCategoriesResponse>(url).pipe(
      map((result) => yearlyCategoriesAdapter(result)),
      catchError((error) => this.handleError("Main Categories", error)),
    );
  }

  /**
   * Retrieves the savings data.
   * @returns An Observable of type Saving[] representing the savings data.
   */
  getSavings(): Observable<Saving[]> {
    const url = `${API_BASE_URL}/savings`;
    return this.http
      .get<Saving[]>(url)
      .pipe(catchError((error) => this.handleError("Savings", error)));
  }

  /**
   * Retrieves the reminders data.
   * @returns An Observable of type Reminder[] representing the reminders data.
   */
  getReminders(): Observable<Reminder[]> {
    const url = `${API_BASE_URL}/reminders`;
    return this.http
      .get<Reminder[]>(url)
      .pipe(catchError((error) => this.handleError("Reminders", error)));
  }

  /**
   * Retrieves every category, optionally filtered by income/expense.
   */
  getCategories(query: GetCategoriesQuery = {}): Observable<Category[]> {
    const url = `${API_BASE_URL}/categories`;
    return this.http
      .get<Category[]>(url, { params: this.toHttpParams(query) })
      .pipe(catchError((error) => this.handleError("Categories", error)));
  }

  /**
   * Retrieves the quote of the day.
   * @returns An Observable of type DailyPhraseResponse representing the quote of the day.
   */
  getQuote(): Observable<DailyPhraseResponse | null> {
    const url = `${API_BASE_URL}/phrases/daily-phrase`;
    return this.http
      .get<DailyPhraseResponse | null>(url)
      .pipe(catchError((error) => this.handleError("Quote", error)));
  }

  /**
   * Searches, filters, and paginates transactions.
   */
  getTransactions(query: GetTransactionsQuery = {}): Observable<PaginatedResponse<Transaction>> {
    const url = `${API_BASE_URL}/transactions`;
    return this.http
      .get<PaginatedResponse<Transaction>>(url, { params: this.toHttpParams(query) })
      .pipe(catchError((error) => this.handleError("Transactions", error)));
  }

  /**
   * Retrieves the newest income transactions.
   * @returns An Observable of type Transaction[] representing the last entries.
   */
  getLastEntries(): Observable<Transaction[]> {
    return this.getTransactions({
      type: "income",
      page: 1,
      pageSize: 15,
      sortOrder: "desc",
    }).pipe(map((result) => result.items ?? []));
  }

  /**
   * Retrieves the newest expense transactions.
   * @returns An Observable of type Transaction[] representing the last exits.
   */
  getLastExits(): Observable<Transaction[]> {
    return this.getTransactions({
      type: "expense",
      page: 1,
      pageSize: 15,
      sortOrder: "desc",
    }).pipe(map((result) => result.items ?? []));
  }

  /**
   * Retrieves every expense recorded against a credit card account, newest first.
   */
  getCardTransactions(creditCardAccountId: string): Observable<Transaction[]> {
    return this.getTransactions({
      type: "expense",
      accountId: creditCardAccountId,
      page: 1,
      pageSize: 100,
      sortOrder: "desc",
    }).pipe(map((result) => result.items ?? []));
  }

  /**
   * Retrieves the expenses that touch a credit card liability account.
   */
  getAllCardTransactions(): Observable<Transaction[]> {
    return this.getTransactions({
      type: "expense",
      page: 1,
      pageSize: 100,
      sortOrder: "desc",
    }).pipe(map((result) => (result.items ?? []).filter((item) => item.affectsLiability)));
  }

  /**
   * Retrieves the analysis summary for a specific year and month.
   *
   * @param year - The year of the analysis summary.
   * @param month - The month of the analysis summary (01-12).
   * @returns An Observable that emits the analysis summary.
   */
  getAnalysisSummary(year: number, month: string): Observable<MonthlyReportResponse> {
    const url = `${API_BASE_URL}/reports/monthly?year=${year}&month=${Number(month)}`;
    return this.http
      .get<MonthlyReportResponse>(url)
      .pipe(catchError((error) => this.handleError("Analysis Summary", error)));
  }

  /**
   * Retrieves monthly income grouped by category for a specific year and month.
   * @param year - The year of the entries.
   * @param month - The month of the entries (01-12).
   * @returns An Observable of SpecialsCategoryItem array representing the monthly entries.
   */
  getMonthlyEntries(year: number, month: string): Observable<SpecialsCategoryItem[]> {
    const { from, to } = monthRange(year, month);
    const url = `${API_BASE_URL}/transactions?type=income&from=${from}&to=${to}&page=1&pageSize=100&sortOrder=asc`;
    return this.http.get<PaginatedResponse<Transaction>>(url).pipe(
      map((result) => categoryTotalsAdapter(result.items ?? [])),
      catchError((error) => this.handleError("Monthly Entries", error)),
    );
  }

  /**
   * Retrieves monthly expenses grouped by category for a specific year and month.
   *
   * @param year - The year for which to retrieve the expenses.
   * @param month - The month for which to retrieve the expenses (01-12).
   * @returns An Observable that emits the category breakdown for the month.
   */
  getMonthlyExits(year: number, month: string): Observable<SpecialsCategoryItem[]> {
    const { from, to } = monthRange(year, month);
    const url = `${API_BASE_URL}/reports/expenses-by-category?from=${from}&to=${to}`;
    return this.http.get<ExpenseCategoryBreakdownItem[]>(url).pipe(
      map((result): SpecialsCategoryItem[] => result ?? []),
      catchError((error) => this.handleError("Monthly Exits", error)),
    );
  }

  /**
   * Retrieves every credit card account.
   */
  getCreditCards(): Observable<CreditCardAccount[]> {
    const url = `${API_BASE_URL}/credit-cards`;
    return this.http
      .get<CreditCardAccount[]>(url)
      .pipe(catchError((error) => this.handleError("Credit Cards", error)));
  }

  /**
   * Retrieves every active account with its server-calculated balance.
   */
  getAccounts(): Observable<Account[]> {
    const url = `${API_BASE_URL}/accounts`;
    return this.http
      .get<Account[]>(url)
      .pipe(catchError((error) => this.handleError("Accounts", error)));
  }

  /**
   * Retrieves transfers, flattened into the table view model.
   */
  getTransfers(page = 1, pageSize = 15): Observable<PaginatedResponse<Transfer>> {
    const url = `${API_BASE_URL}/transfers?page=${page}&pageSize=${pageSize}`;
    return this.http.get<PaginatedResponse<TransferTransaction>>(url).pipe(
      map((result) => paginatedTransfersAdapter(result)),
      catchError((error) => this.handleError("Transfers", error)),
    );
  }

  /**
   * Retrieves debit cards, optionally filtered by linked account.
   */
  getDebitCards(
    accountId?: string,
    page = 1,
    pageSize = 15,
  ): Observable<PaginatedResponse<DebitCard>> {
    const url = `${API_BASE_URL}/debit-cards?page=${page}&pageSize=${pageSize}`;
    return this.http
      .get<PaginatedResponse<DebitCard>>(url, { params: this.toHttpParams({ accountId }) })
      .pipe(catchError((error) => this.handleError("Debit Cards", error)));
  }

  /**
   * Retrieves the current billing summary for every credit card.
   */
  getPurchases(): Observable<CreditCardPurchasesSummary[]> {
    const url = `${API_BASE_URL}/credit-cards/purchases`;
    return this.http
      .get<CreditCardPurchasesSummary[]>(url)
      .pipe(catchError((error) => this.handleError("Purchases", error)));
  }

  /**
   * Retrieves every loan with its computed totals and latest payments.
   */
  getLoans(): Observable<LoanListItem[]> {
    const url = `${API_BASE_URL}/loans`;
    return this.http
      .get<LoanListItem[]>(url)
      .pipe(catchError((error) => this.handleError("Loans", error)));
  }

  /**
   * Loads a query object into `HttpParams`, skipping blank values.
   */
  private toHttpParams(query: object): HttpParams {
    let params = new HttpParams();

    for (const [key, value] of Object.entries(query)) {
      if (isBlank(value)) continue;
      params = params.set(key, String(value));
    }

    return params;
  }

  private handleError(label: string, error: unknown) {
    console.error(`Error fetching ${label}`, error);
    return throwError(() => new Error(`Error fetching ${label}`));
  }
}
