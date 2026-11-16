/**
 * Money Minder API — Frontend TypeScript Request & Form Interfaces
 * Based on docs/BACKEND_API.md, NestJS controllers, and DTO validators.
 *
 * NOTE: The backend runs a global ValidationPipe configured with:
 *   { transform: true, whitelist: true, forbidNonWhitelisted: true }
 * This means any extraneous properties not declared in these payloads will cause
 * a 400 Bad Request error. Only send the fields defined in these interfaces.
 */

import type {
  AccountType,
  CategoryType,
  ISODateString,
  ISODateTimeString,
  LoanDirection,
  LoanStatus,
  OAuthProvider,
  ReminderRecurrence,
  ReminderStatus,
  TransactionType,
} from "./API_RESPONSES.model";

// Re-export shared domain types for convenience so callers can import everything from one place
export type {
  AccountType,
  CategoryType,
  ISODateString,
  ISODateTimeString,
  LoanDirection,
  LoanStatus,
  OAuthProvider,
  ReminderRecurrence,
  ReminderStatus,
  TransactionType,
};

// ============================================================================
// 0. COMMON & PRIMITIVE REQUEST TYPES
// ============================================================================

/**
 * Money values sent in request bodies.
 * The backend prefers a decimal string with two decimals (e.g. "1250.00"),
 * but accepts numbers which get transformed to strings before validation.
 */
export type MoneyInput = string | number;

/** Adjustment directions for adjustment transactions */
export type AdjustmentDirection = "increase" | "decrease";

/** Sorting directions accepted in query parameters */
export type SortOrder = "asc" | "desc";

/** Transaction types allowed when creating non-transfer transactions */
export type NonTransferTransactionType = "income" | "expense" | "adjustment";

/**
 * Common pagination query parameters.
 * Extends endpoints listing transactions, transfers, debit cards, and account history.
 */
export interface PaginationQuery {
  /** Page number, 1-based. Defaults to 1. */
  page?: number;
  /** Number of items per page. 1-100, defaults to 15. */
  pageSize?: number;
}

// ============================================================================
// 1. AUTH & USER PROFILES
// ============================================================================

/**
 * PATCH /api/v1/users/me
 * Form payload for updating the current user's profile.
 */
export interface UpdateUserPayload {
  /** User's display name */
  name?: string;
  /** URL for the user's avatar image */
  avatarUrl?: string;
}

/**
 * POST /api/v1/users (Internal / Admin / Service use)
 */
export interface CreateUserPayload {
  email: string;
  name: string;
  avatarUrl?: string;
}

/**
 * GET /api/v1/auth/google
 * GET /api/v1/auth/github
 * Query parameters for initiating social OAuth login.
 */
export interface StartOAuthQuery {
  /** URL to redirect the browser to after authentication (must be a trusted origin) */
  callbackURL?: string;
}

/**
 * POST /api/v1/auth/sign-in/email (Better Auth)
 * Form payload for email/password sign-in.
 */
export interface SignInEmailPayload {
  email: string;
  password: string;
}

/**
 * POST /api/v1/auth/sign-up/email (Better Auth)
 * Form payload for email/password registration.
 */
export interface SignUpEmailPayload {
  email: string;
  password: string;
  name: string;
  image?: string;
}

/**
 * POST /api/v1/auth/sign-in/social (Better Auth)
 */
export interface SignInSocialPayload {
  provider: OAuthProvider;
  callbackURL?: string;
}

// ============================================================================
// 2. ACCOUNTS
// ============================================================================

/**
 * POST /api/v1/accounts
 * Form payload for creating a new ledger account.
 */
export interface CreateAccountPayload {
  /** Account name (max 100 characters) */
  name: string;
  /** Account classification. Defaults to "bank". */
  type?: AccountType;
  /** Initial opening balance as a decimal string (e.g. "100.00") or number. Defaults to "0". */
  openingBalance?: MoneyInput;
  /** ISO-8601 date when the opening balance applies. Defaults to now. */
  openingBalanceDate?: ISODateTimeString | ISODateString;
}

/**
 * PATCH /api/v1/accounts/:id
 * Form payload for editing an existing account.
 */
export interface UpdateAccountPayload {
  /** Account name (max 100 characters) */
  name?: string;
  /** Revised opening balance */
  openingBalance?: MoneyInput;
  /** ISO-8601 date when the opening balance applies */
  openingBalanceDate?: ISODateTimeString | ISODateString;
  /** Archive or reactivate the account */
  isActive?: boolean;
}

/**
 * GET /api/v1/accounts
 * GET /api/v1/accounts/balances
 * Query parameters for listing accounts.
 */
export interface GetAccountsQuery {
  /** Include soft-deleted / archived accounts. Defaults to false. */
  includeArchived?: boolean;
  /** Compute balances as of a specific date-time */
  asOf?: ISODateTimeString | ISODateString;
}

/**
 * GET /api/v1/accounts/:id
 * GET /api/v1/accounts/:id/balance
 * Query parameters for fetching single account balance.
 */
export interface GetBalanceQuery {
  /** Compute balance as of a specific date-time */
  asOf?: ISODateTimeString | ISODateString;
}

/**
 * GET /api/v1/accounts/:id/balances
 * Query parameters for historical daily balances series.
 */
export interface GetBalanceRangeQuery {
  /** Start date (ISO-8601 date or date-time) */
  from: ISODateTimeString | ISODateString;
  /** End date (ISO-8601 date or date-time) */
  to: ISODateTimeString | ISODateString;
}

/**
 * GET /api/v1/accounts/:id/transactions
 * Query parameters for paginated account ledger history.
 */
export interface GetAccountHistoryQuery extends PaginationQuery {
  /** Filter transactions on or after this date */
  from?: ISODateTimeString | ISODateString;
  /** Filter transactions on or before this date */
  to?: ISODateTimeString | ISODateString;
}

/**
 * DELETE /api/v1/accounts/:id
 * Query parameters for account deletion.
 */
export interface DeleteAccountQuery {
  /**
   * If true, hard-deletes the account and cascades ledger entries if allowed.
   * If false or omitted, soft-archives the account. Defaults to false.
   */
  hard?: boolean;
}

// ============================================================================
// 3. CATEGORIES
// ============================================================================

/**
 * POST /api/v1/categories
 * Form payload for creating a category.
 */
export interface CreateCategoryPayload {
  /** Category display name (e.g. "Groceries", "Salary") */
  name: string;
  /** Category type */
  type: CategoryType;
}

/**
 * PATCH /api/v1/categories/:id
 * Form payload for modifying a category.
 */
export interface UpdateCategoryPayload {
  /** Updated category name */
  name?: string;
  /** Updated category type */
  type?: CategoryType;
}

/**
 * GET /api/v1/categories
 * Query parameters for filtering categories by type.
 */
export interface GetCategoriesQuery {
  /** Filter categories by "income" or "expense" */
  type?: CategoryType;
}

// ============================================================================
// 4. TRANSACTIONS
// ============================================================================

/**
 * Base transaction form payload fields.
 */
interface BaseCreateTransactionPayload {
  /** Positive money amount (e.g. "45.50" or 45.50) */
  amount: MoneyInput;
  /** Target account UUID */
  accountId: string;
  /** Category UUID (optional for income/expense, omitted for adjustments) */
  categoryId?: string;
  /** Optional transaction memo or description (max 500 characters) */
  description?: string;
  /** ISO-8601 date-time when transaction took place. Defaults to current timestamp. */
  occurredAt?: ISODateTimeString | ISODateString;
}

/** Form payload for creating an income transaction */
export interface CreateIncomeTransactionPayload extends BaseCreateTransactionPayload {
  type: "income";
}

/** Form payload for creating an expense transaction */
export interface CreateExpenseTransactionPayload extends BaseCreateTransactionPayload {
  type: "expense";
}

/** Form payload for creating an adjustment transaction (requires direction) */
export interface CreateAdjustmentTransactionPayload extends BaseCreateTransactionPayload {
  type: "adjustment";
  /** Mandatory for adjustment transactions: whether to increase or decrease balance */
  direction: AdjustmentDirection;
}

/**
 * POST /api/v1/transactions
 * Discriminated union of valid transaction payloads.
 * For adjustments, `direction` is strictly enforced.
 */
export type CreateTransactionPayload =
  | CreateIncomeTransactionPayload
  | CreateExpenseTransactionPayload
  | CreateAdjustmentTransactionPayload;

/**
 * PATCH /api/v1/transactions/:id
 * Form payload for updating / correcting an existing transaction.
 */
export interface UpdateTransactionPayload {
  /** Updated positive money amount */
  amount?: MoneyInput;
  /** Move transaction to another account */
  accountId?: string;
  /**
   * Reassign category UUID, or pass `null` to clear the category.
   * Omit to leave category unchanged.
   */
  categoryId?: string | null;
  /** Updated description (max 500 characters) */
  description?: string;
  /** Updated ISO-8601 timestamp */
  occurredAt?: ISODateTimeString | ISODateString;
  /** Applicable when editing an adjustment transaction */
  direction?: AdjustmentDirection;
}

/**
 * GET /api/v1/transactions
 * Query parameters for searching, filtering, and paginating transactions.
 */
export interface GetTransactionsQuery extends PaginationQuery {
  /** Filter transactions on or after this date */
  from?: ISODateTimeString | ISODateString;
  /** Filter transactions on or before this date */
  to?: ISODateTimeString | ISODateString;
  /** Filter by transaction type */
  type?: TransactionType;
  /** Filter by category UUID */
  categoryId?: string;
  /** Filter by account UUID */
  accountId?: string;
  /** Sort order by occurredAt. Defaults to "desc". */
  sortOrder?: SortOrder;
  /** Include reversed transactions and compensating reversals. Defaults to true. */
  includeReversed?: boolean;
}

/**
 * POST /api/v1/transactions/:id/reverse
 * Payload for creating a compensating reversal transaction.
 */
export interface ReverseTransactionPayload {
  /**
   * Date-time when the reversal should be posted.
   * Defaults to the current timestamp if omitted.
   */
  occurredAt?: ISODateTimeString | ISODateString;
}

/**
 * DELETE /api/v1/transactions/:id
 * Query parameters for deleting/reversing a transaction.
 */
export interface DeleteTransactionQuery {
  /**
   * If true, hard deletes the transaction from the ledger.
   * If false or omitted, creates a compensating reversal transaction.
   * Defaults to false.
   */
  hard?: boolean;
}

// ============================================================================
// 5. TRANSFERS
// ============================================================================

/**
 * POST /api/v1/transfers
 * Form payload for creating a transfer between two accounts.
 */
export interface CreateTransferPayload {
  /** Source account UUID (debited) */
  fromAccountId: string;
  /** Destination account UUID (credited) */
  toAccountId: string;
  /** Transfer amount (positive decimal string or number) */
  amount: MoneyInput;
  /**
   * Optional transfer fee debited from source account.
   * Defaults to "0".
   */
  fee?: MoneyInput;
  /** ISO-8601 date-time when transfer occurred. Defaults to now. */
  occurredAt?: ISODateTimeString | ISODateString;
  /** Optional memo or description (max 500 characters) */
  description?: string;
}

/**
 * PATCH /api/v1/transfers/:transactionId
 * Form payload for updating an existing transfer.
 */
export interface UpdateTransferPayload {
  /** Updated transfer amount */
  amount?: MoneyInput;
  /** Updated fee amount */
  fee?: MoneyInput;
  /** Updated ISO-8601 timestamp */
  occurredAt?: ISODateTimeString | ISODateString;
  /** Updated description (max 500 characters) */
  description?: string;
}

/**
 * GET /api/v1/transfers
 * Query parameters for listing and paginating transfers.
 */
export interface GetTransfersQuery extends PaginationQuery {
  /** Filter transfers on or after this date */
  from?: ISODateTimeString | ISODateString;
  /** Filter transfers on or before this date */
  to?: ISODateTimeString | ISODateString;
  /** Filter transfers involving this account UUID (either source or target) */
  accountId?: string;
  /** Sort order by occurredAt. Defaults to "desc". */
  sortOrder?: SortOrder;
}

/**
 * POST /api/v1/transfers/:transactionId/reverse
 * Payload for reversing a transfer.
 */
export interface ReverseTransferPayload {
  /** Date-time for the compensating reversal. Defaults to now. */
  occurredAt?: ISODateTimeString | ISODateString;
}

/**
 * DELETE /api/v1/transfers/:transactionId
 * Query parameters for transfer deletion.
 */
export interface DeleteTransferQuery {
  /**
   * If true, hard deletes the transfer.
   * If false or omitted, posts a compensating reversal transfer.
   * Defaults to false.
   */
  hard?: boolean;
}

// ============================================================================
// 6. CREDIT CARDS
// ============================================================================

/**
 * POST /api/v1/credit-cards
 * Form payload for creating a credit card liability account.
 */
export interface CreateCreditCardPayload {
  /** Card name (max 100 characters, e.g. "Chase Sapphire") */
  name: string;
  /** Credit limit as positive decimal string or number */
  creditLimit: MoneyInput;
  /** Day of the month when billing cycle closes (1-31) */
  statementDay: number;
  /** Day of the month when payment is due (1-31) */
  dueDay: number;
  /** Exactly 4 digits for card reference (e.g. "4589") */
  last4?: string;
  /** Initial debt / opening balance. Defaults to "0". */
  openingBalance?: MoneyInput;
  /** ISO-8601 date when opening balance applies */
  openingBalanceDate?: ISODateTimeString | ISODateString;
  /** Default asset account UUID used to pay off this credit card */
  paymentAccountId?: string;
}

/**
 * PATCH /api/v1/credit-cards/:accountId
 * Form payload for updating credit card metadata.
 */
export interface UpdateCreditCardPayload {
  /** Card name (max 100 characters) */
  name?: string;
  /** Revised credit limit */
  creditLimit?: MoneyInput;
  /** Day of billing cycle close (1-31) */
  statementDay?: number;
  /** Day payment is due (1-31) */
  dueDay?: number;
  /** Exactly 4 digits */
  last4?: string;
  /**
   * Default asset account UUID for payments, or `null` to detach.
   */
  paymentAccountId?: string | null;
  /** Revised opening balance */
  openingBalance?: MoneyInput;
  /** Revised opening balance date */
  openingBalanceDate?: ISODateTimeString | ISODateString;
}

/**
 * POST /api/v1/credit-cards/:accountId/payments
 * Form payload for paying down a credit card balance from an asset account.
 */
export interface PayCreditCardPayload {
  /** Source asset account UUID (bank, checking, savings) */
  fromAccountId: string;
  /** Payment amount (positive decimal string or number) */
  amount: MoneyInput;
  /** Optional transaction fee. Defaults to "0". */
  fee?: MoneyInput;
  /** ISO-8601 date-time of the payment. Defaults to now. */
  occurredAt?: ISODateTimeString | ISODateString;
  /** Optional memo (max 500 characters) */
  description?: string;
}

/**
 * GET /api/v1/credit-cards
 * Query parameters for listing credit cards.
 */
export interface GetCreditCardsQuery {
  /** Include archived cards. Defaults to false. */
  includeArchived?: boolean;
}

/**
 * DELETE /api/v1/credit-cards/:accountId
 * Query parameters for deleting a credit card account.
 */
export interface DeleteCreditCardQuery {
  /** Hard delete if true; soft archive if false. Defaults to false. */
  hard?: boolean;
}

// ============================================================================
// 7. DEBIT CARDS
// ============================================================================

/**
 * POST /api/v1/debit-cards
 * Form payload for linking a debit card to a bank/asset account.
 */
export interface CreateDebitCardPayload {
  /** Asset account UUID to which this debit card is tied */
  accountId: string;
  /** Debit card display name (max 100 characters) */
  name: string;
  /** Exactly 4 digits for card reference */
  last4?: string;
}

/**
 * PATCH /api/v1/debit-cards/:id
 * Form payload for editing a debit card.
 */
export interface UpdateDebitCardPayload {
  /** Re-link to another account UUID */
  accountId?: string;
  /** Updated name */
  name?: string;
  /** Exactly 4 digits */
  last4?: string;
}

/**
 * GET /api/v1/debit-cards
 * Query parameters for listing debit cards.
 */
export interface GetDebitCardsQuery extends PaginationQuery {
  /** Filter debit cards linked to a specific account UUID */
  accountId?: string;
}

// ============================================================================
// 8. REPORTS
// ============================================================================

/**
 * GET /api/v1/reports/monthly
 * Query parameters for monthly financial report.
 */
export interface MonthlyReportQuery {
  /** Month number (1-12) */
  month: number;
  /** 4-digit calendar year (1900-2100) */
  year: number;
  /** Include transfer fees in total expenses. Defaults to false. */
  includeTransferFees?: boolean;
}

/**
 * GET /api/v1/reports/yearly
 * Query parameters for yearly financial report with monthly series.
 */
export interface YearlyReportQuery {
  /** 4-digit calendar year (1900-2100) */
  year: number;
  /** Include transfer fees in total expenses. Defaults to false. */
  includeTransferFees?: boolean;
}

/**
 * GET /api/v1/reports/range
 * Query parameters for custom date range financial report.
 */
export interface RangeReportQuery {
  /** Start date-time (ISO-8601) */
  from: ISODateTimeString | ISODateString;
  /** End date-time (ISO-8601) */
  to: ISODateTimeString | ISODateString;
  /** Include transfer fees in total expenses. Defaults to false. */
  includeTransferFees?: boolean;
}

/**
 * GET /api/v1/reports/expenses-by-category
 * Query parameters for category-grouped expense breakdown.
 */
export interface ExpenseBreakdownQuery {
  /** Start date-time (ISO-8601) */
  from: ISODateTimeString | ISODateString;
  /** End date-time (ISO-8601) */
  to: ISODateTimeString | ISODateString;
  /** Include transfer fees as a breakdown item. Defaults to false. */
  includeTransferFees?: boolean;
}

/**
 * GET /api/v1/reports/account-balances
 * Query parameters for account balances report.
 */
export interface AccountBalancesReportQuery {
  /** Balance calculation snapshot date-time (ISO-8601). Defaults to now. */
  asOf?: ISODateTimeString | ISODateString;
  /** Include archived accounts. Defaults to false. */
  includeArchived?: boolean;
}

/**
 * GET /api/v1/reports/cash-flow
 * Query parameters for cash flow breakdown series.
 */
export interface CashFlowReportQuery {
  /** 4-digit calendar year (1900-2100) */
  year: number;
  /** Include transfer fees in expense calculations. Defaults to false. */
  includeTransferFees?: boolean;
  /** Sort order for months. Defaults to "asc". */
  sortOrder?: SortOrder;
}

// ============================================================================
// 9. DASHBOARD SPECIALS (LEGACY COMPATIBILITY)
// ============================================================================

/**
 * GET /api/v1/specials/financial-summary-yearly
 */
export interface SpecialsFinancialSummaryYearlyQuery {
  /** 4-digit calendar year (1900-2100) */
  year: number;
}

/**
 * GET /api/v1/specials/financial-summary-monthly
 */
export interface SpecialsFinancialSummaryMonthlyQuery {
  /** 4-digit calendar year (1900-2100) */
  year: number;
  /** Month number (1-12) */
  month: number;
}

/**
 * GET /api/v1/specials/cash-flow
 */
export interface SpecialsCashFlowQuery {
  /** 4-digit calendar year (1900-2100) */
  year: number;
}

/**
 * GET /api/v1/specials/yearly-categories
 */
export interface SpecialsYearlyCategoriesQuery {
  /** 4-digit calendar year (1900-2100) */
  year: number;
}

/**
 * GET /api/v1/specials/recent-transactions
 */
export interface SpecialsRecentTransactionsQuery {
  /** 4-digit calendar year (1900-2100) */
  year: number;
}

// ============================================================================
// 10. LOANS & LOAN PAYMENTS
// ============================================================================

/**
 * POST /api/v1/loans
 * Form payload for creating a loan tracker.
 */
export interface CreateLoanPayload {
  /** Loan title or contact name (e.g. "Personal loan to John") */
  name: string;
  /** Direction: "borrowed" (user owes money) or "lent" (user is owed money) */
  direction: LoanDirection;
  /** Principal loan amount (minimum 0.01) */
  principal: number;
  /** Annual interest rate percentage (e.g. 5.5 for 5.5%). Defaults to 0. */
  interestRate?: number;
  /** ISO-8601 start date */
  startDate: ISODateTimeString | ISODateString;
  /** Optional ISO-8601 target payoff / due date */
  dueDate?: ISODateTimeString | ISODateString;
  /** Status: "active" | "paid". Defaults to "active". */
  status?: LoanStatus;
}

/**
 * PATCH /api/v1/loans/:loanId
 * Form payload for editing a loan.
 */
export interface UpdateLoanPayload {
  /** Updated loan name */
  name?: string;
  /** Updated direction */
  direction?: LoanDirection;
  /** Updated principal amount (minimum 0.01) */
  principal?: number;
  /** Updated annual interest rate percentage */
  interestRate?: number;
  /** Updated start date */
  startDate?: ISODateTimeString | ISODateString;
  /** Updated due date */
  dueDate?: ISODateTimeString | ISODateString;
  /** Updated status */
  status?: LoanStatus;
}

/**
 * POST /api/v1/loans/:loanId/payments
 * Form payload for registering a payment against a loan.
 */
export interface CreateLoanPaymentPayload {
  /** Payment amount (minimum 0.01) */
  amount: number;
  /** ISO-8601 date when payment was made. Defaults to now. */
  paidAt?: ISODateTimeString | ISODateString;
  /** Optional note or receipt reference */
  note?: string;
}

/**
 * PATCH /api/v1/loans/:loanId/payments/:paymentId
 * Form payload for modifying a recorded loan payment.
 */
export interface UpdateLoanPaymentPayload {
  /** Updated payment amount (minimum 0.01) */
  amount?: number;
  /** Updated payment date */
  paidAt?: ISODateTimeString | ISODateString;
  /** Updated payment note */
  note?: string;
}

// ============================================================================
// 11. REMINDERS
// ============================================================================

/**
 * POST /api/v1/reminders
 * Form payload for creating a payment / bill reminder.
 */
export interface CreateReminderPayload {
  /** Reminder title (e.g. "Rent", "Electric Bill") */
  title: string;
  /** Optional expected bill amount (minimum 0) */
  amount?: number;
  /** Due date-time (ISO-8601) */
  dueAt: ISODateTimeString | ISODateString;
  /** Recurrence pattern. Defaults to "none". */
  recurrence?: ReminderRecurrence;
  /** Status: "pending" | "done". Defaults to "pending". */
  status?: ReminderStatus;
}

/**
 * PATCH /api/v1/reminders/:id
 * Form payload for editing a reminder.
 */
export interface UpdateReminderPayload {
  /** Updated title */
  title?: string;
  /** Updated expected bill amount */
  amount?: number;
  /** Updated due date-time */
  dueAt?: ISODateTimeString | ISODateString;
  /** Updated recurrence pattern */
  recurrence?: ReminderRecurrence;
  /** Updated status */
  status?: ReminderStatus;
}

// ============================================================================
// 12. SAVINGS
// ============================================================================

/**
 * POST /api/v1/savings
 * Form payload for creating a savings goal.
 */
export interface CreateSavingPayload {
  /** Savings goal title (e.g. "Emergency Fund", "New Laptop") */
  name: string;
  /** Target goal amount (minimum 0.01) */
  targetAmount: number;
  /** Initial amount saved. Defaults to 0. */
  currentAmount?: number;
  /** Optional target completion date (ISO-8601) */
  targetDate?: ISODateTimeString | ISODateString;
}

/**
 * PATCH /api/v1/savings/:id
 * Form payload for editing a savings goal.
 */
export interface UpdateSavingPayload {
  /** Updated savings goal name */
  name?: string;
  /** Updated target amount */
  targetAmount?: number;
  /** Updated current saved amount */
  currentAmount?: number;
  /** Updated target date */
  targetDate?: ISODateTimeString | ISODateString;
}

// ============================================================================
// 13. API ENDPOINT REQUEST MAPS
// ============================================================================

/**
 * Endpoint map for HTTP routes that accept a JSON body payload (POST, PATCH, PUT).
 * Use this in frontend API clients (e.g. Axios, TanStack Query, Redux Toolkit, fetch)
 * to ensure exact, strictly-typed request bodies.
 */
export interface ApiEndpointBodyMap {
  // Auth & Better Auth
  "POST /api/v1/auth/sign-in/email": SignInEmailPayload;
  "POST /api/v1/auth/sign-up/email": SignUpEmailPayload;
  "POST /api/v1/auth/sign-in/social": SignInSocialPayload;

  // Users
  "PATCH /api/v1/users/me": UpdateUserPayload;

  // Accounts
  "POST /api/v1/accounts": CreateAccountPayload;
  "PATCH /api/v1/accounts/:id": UpdateAccountPayload;

  // Categories
  "POST /api/v1/categories": CreateCategoryPayload;
  "PATCH /api/v1/categories/:id": UpdateCategoryPayload;

  // Transactions
  "POST /api/v1/transactions": CreateTransactionPayload;
  "PATCH /api/v1/transactions/:id": UpdateTransactionPayload;
  "POST /api/v1/transactions/:id/reverse": ReverseTransactionPayload;

  // Transfers
  "POST /api/v1/transfers": CreateTransferPayload;
  "PATCH /api/v1/transfers/:transactionId": UpdateTransferPayload;
  "POST /api/v1/transfers/:transactionId/reverse": ReverseTransferPayload;

  // Credit Cards
  "POST /api/v1/credit-cards": CreateCreditCardPayload;
  "PATCH /api/v1/credit-cards/:accountId": UpdateCreditCardPayload;
  "POST /api/v1/credit-cards/:accountId/payments": PayCreditCardPayload;

  // Debit Cards
  "POST /api/v1/debit-cards": CreateDebitCardPayload;
  "PATCH /api/v1/debit-cards/:id": UpdateDebitCardPayload;

  // Loans
  "POST /api/v1/loans": CreateLoanPayload;
  "PATCH /api/v1/loans/:loanId": UpdateLoanPayload;
  "POST /api/v1/loans/:loanId/payments": CreateLoanPaymentPayload;
  "PATCH /api/v1/loans/:loanId/payments/:paymentId": UpdateLoanPaymentPayload;

  // Reminders
  "POST /api/v1/reminders": CreateReminderPayload;
  "PATCH /api/v1/reminders/:id": UpdateReminderPayload;

  // Savings
  "POST /api/v1/savings": CreateSavingPayload;
  "PATCH /api/v1/savings/:id": UpdateSavingPayload;
}

/**
 * Endpoint map for routes that accept URL query parameters.
 */
export interface ApiEndpointQueryMap {
  // Auth
  "GET /api/v1/auth/google": StartOAuthQuery;
  "GET /api/v1/auth/github": StartOAuthQuery;

  // Accounts
  "GET /api/v1/accounts": GetAccountsQuery;
  "GET /api/v1/accounts/balances": GetAccountsQuery;
  "GET /api/v1/accounts/:id": GetBalanceQuery;
  "GET /api/v1/accounts/:id/balance": GetBalanceQuery;
  "GET /api/v1/accounts/:id/balances": GetBalanceRangeQuery;
  "GET /api/v1/accounts/:id/transactions": GetAccountHistoryQuery;
  "DELETE /api/v1/accounts/:id": DeleteAccountQuery;

  // Categories
  "GET /api/v1/categories": GetCategoriesQuery;

  // Transactions
  "GET /api/v1/transactions": GetTransactionsQuery;
  "DELETE /api/v1/transactions/:id": DeleteTransactionQuery;

  // Transfers
  "GET /api/v1/transfers": GetTransfersQuery;
  "DELETE /api/v1/transfers/:transactionId": DeleteTransferQuery;

  // Credit Cards
  "GET /api/v1/credit-cards": GetCreditCardsQuery;
  "DELETE /api/v1/credit-cards/:accountId": DeleteCreditCardQuery;

  // Debit Cards
  "GET /api/v1/debit-cards": GetDebitCardsQuery;

  // Reports
  "GET /api/v1/reports/monthly": MonthlyReportQuery;
  "GET /api/v1/reports/yearly": YearlyReportQuery;
  "GET /api/v1/reports/range": RangeReportQuery;
  "GET /api/v1/reports/expenses-by-category": ExpenseBreakdownQuery;
  "GET /api/v1/reports/account-balances": AccountBalancesReportQuery;
  "GET /api/v1/reports/cash-flow": CashFlowReportQuery;

  // Specials
  "GET /api/v1/specials/financial-summary-yearly": SpecialsFinancialSummaryYearlyQuery;
  "GET /api/v1/specials/financial-summary-monthly": SpecialsFinancialSummaryMonthlyQuery;
  "GET /api/v1/specials/cash-flow": SpecialsCashFlowQuery;
  "GET /api/v1/specials/yearly-categories": SpecialsYearlyCategoriesQuery;
  "GET /api/v1/specials/recent-transactions": SpecialsRecentTransactionsQuery;
}

/**
 * Unified endpoint request descriptor mapping every endpoint to its required parameters.
 */
export interface ApiEndpointRequestMap {
  // Public smoke & health
  "GET /hello": { query?: never; body?: never };
  "GET /ping": { query?: never; body?: never };
  "GET /health": { query?: never; body?: never };

  // Auth & Users
  "GET /api/v1/auth/me": { query?: never; body?: never };
  "GET /api/v1/auth/google": { query?: StartOAuthQuery; body?: never };
  "GET /api/v1/auth/github": { query?: StartOAuthQuery; body?: never };
  "POST /api/v1/auth/sign-in/email": { query?: never; body: SignInEmailPayload };
  "POST /api/v1/auth/sign-up/email": { query?: never; body: SignUpEmailPayload };
  "POST /api/v1/auth/sign-in/social": { query?: never; body: SignInSocialPayload };
  "GET /api/v1/users/me": { query?: never; body?: never };
  "PATCH /api/v1/users/me": { query?: never; body: UpdateUserPayload };

  // Accounts
  "GET /api/v1/accounts": { query?: GetAccountsQuery; body?: never };
  "GET /api/v1/accounts/balances": { query?: GetAccountsQuery; body?: never };
  "POST /api/v1/accounts": { query?: never; body: CreateAccountPayload };
  "GET /api/v1/accounts/:id": { query?: GetBalanceQuery; body?: never };
  "PATCH /api/v1/accounts/:id": { query?: never; body: UpdateAccountPayload };
  "POST /api/v1/accounts/:id/archive": { query?: never; body?: never };
  "DELETE /api/v1/accounts/:id": { query?: DeleteAccountQuery; body?: never };
  "GET /api/v1/accounts/:id/balance": { query?: GetBalanceQuery; body?: never };
  "GET /api/v1/accounts/:id/balances": { query: GetBalanceRangeQuery; body?: never };
  "GET /api/v1/accounts/:id/transactions": { query?: GetAccountHistoryQuery; body?: never };

  // Categories
  "GET /api/v1/categories": { query?: GetCategoriesQuery; body?: never };
  "POST /api/v1/categories": { query?: never; body: CreateCategoryPayload };
  "PATCH /api/v1/categories/:id": { query?: never; body: UpdateCategoryPayload };
  "DELETE /api/v1/categories/:id": { query?: never; body?: never };

  // Transactions
  "POST /api/v1/transactions": { query?: never; body: CreateTransactionPayload };
  "GET /api/v1/transactions": { query?: GetTransactionsQuery; body?: never };
  "GET /api/v1/transactions/:id": { query?: never; body?: never };
  "GET /api/v1/transactions/:id/movements": { query?: never; body?: never };
  "PATCH /api/v1/transactions/:id": { query?: never; body: UpdateTransactionPayload };
  "DELETE /api/v1/transactions/:id": { query?: DeleteTransactionQuery; body?: never };
  "POST /api/v1/transactions/:id/reverse": { query?: never; body?: ReverseTransactionPayload };

  // Transfers
  "POST /api/v1/transfers": { query?: never; body: CreateTransferPayload };
  "GET /api/v1/transfers": { query?: GetTransfersQuery; body?: never };
  "GET /api/v1/transfers/:transactionId": { query?: never; body?: never };
  "GET /api/v1/transfers/:transactionId/movements": { query?: never; body?: never };
  "PATCH /api/v1/transfers/:transactionId": { query?: never; body: UpdateTransferPayload };
  "DELETE /api/v1/transfers/:transactionId": { query?: DeleteTransferQuery; body?: never };
  "POST /api/v1/transfers/:transactionId/reverse": { query?: never; body?: ReverseTransferPayload };

  // Credit Cards
  "POST /api/v1/credit-cards": { query?: never; body: CreateCreditCardPayload };
  "GET /api/v1/credit-cards": { query?: GetCreditCardsQuery; body?: never };
  "GET /api/v1/credit-cards/purchases": { query?: never; body?: never };
  "GET /api/v1/credit-cards/:accountId": { query?: never; body?: never };
  "GET /api/v1/credit-cards/:accountId/summary": { query?: never; body?: never };
  "GET /api/v1/credit-cards/:accountId/purchases": { query?: never; body?: never };
  "PATCH /api/v1/credit-cards/:accountId": { query?: never; body: UpdateCreditCardPayload };
  "POST /api/v1/credit-cards/:accountId/payments": { query?: never; body: PayCreditCardPayload };
  "DELETE /api/v1/credit-cards/:accountId": { query?: DeleteCreditCardQuery; body?: never };

  // Debit Cards
  "POST /api/v1/debit-cards": { query?: never; body: CreateDebitCardPayload };
  "GET /api/v1/debit-cards": { query?: GetDebitCardsQuery; body?: never };
  "GET /api/v1/debit-cards/:id": { query?: never; body?: never };
  "PATCH /api/v1/debit-cards/:id": { query?: never; body: UpdateDebitCardPayload };
  "DELETE /api/v1/debit-cards/:id": { query?: never; body?: never };

  // Reports
  "GET /api/v1/reports/monthly": { query: MonthlyReportQuery; body?: never };
  "GET /api/v1/reports/yearly": { query: YearlyReportQuery; body?: never };
  "GET /api/v1/reports/range": { query: RangeReportQuery; body?: never };
  "GET /api/v1/reports/expenses-by-category": { query: ExpenseBreakdownQuery; body?: never };
  "GET /api/v1/reports/account-balances": { query?: AccountBalancesReportQuery; body?: never };
  "GET /api/v1/reports/credit-cards": { query?: never; body?: never };
  "GET /api/v1/reports/cash-flow": { query: CashFlowReportQuery; body?: never };

  // Specials (Dashboard)
  "GET /api/v1/specials/financial-summary-yearly": {
    query: SpecialsFinancialSummaryYearlyQuery;
    body?: never;
  };
  "GET /api/v1/specials/financial-summary-monthly": {
    query: SpecialsFinancialSummaryMonthlyQuery;
    body?: never;
  };
  "GET /api/v1/specials/cash-flow": { query: SpecialsCashFlowQuery; body?: never };
  "GET /api/v1/specials/yearly-categories": { query: SpecialsYearlyCategoriesQuery; body?: never };
  "GET /api/v1/specials/recent-transactions": {
    query: SpecialsRecentTransactionsQuery;
    body?: never;
  };

  // Loans
  "POST /api/v1/loans": { query?: never; body: CreateLoanPayload };
  "GET /api/v1/loans": { query?: never; body?: never };
  "GET /api/v1/loans/:loanId": { query?: never; body?: never };
  "PATCH /api/v1/loans/:loanId": { query?: never; body: UpdateLoanPayload };
  "DELETE /api/v1/loans/:loanId": { query?: never; body?: never };
  "POST /api/v1/loans/:loanId/payments": { query?: never; body: CreateLoanPaymentPayload };
  "PATCH /api/v1/loans/:loanId/payments/:paymentId": {
    query?: never;
    body: UpdateLoanPaymentPayload;
  };
  "DELETE /api/v1/loans/:loanId/payments/:paymentId": { query?: never; body?: never };

  // Reminders
  "POST /api/v1/reminders": { query?: never; body: CreateReminderPayload };
  "GET /api/v1/reminders": { query?: never; body?: never };
  "GET /api/v1/reminders/:id": { query?: never; body?: never };
  "PATCH /api/v1/reminders/:id": { query?: never; body: UpdateReminderPayload };
  "DELETE /api/v1/reminders/:id": { query?: never; body?: never };

  // Savings
  "POST /api/v1/savings": { query?: never; body: CreateSavingPayload };
  "GET /api/v1/savings": { query?: never; body?: never };
  "GET /api/v1/savings/:id": { query?: never; body?: never };
  "PATCH /api/v1/savings/:id": { query?: never; body: UpdateSavingPayload };
  "DELETE /api/v1/savings/:id": { query?: never; body?: never };

  // Phrases
  "GET /api/v1/phrases/daily-phrase": { query?: never; body?: never };
}

// ============================================================================
// 14. TYPE UTILITY HELPERS FOR FRONTEND CLIENTS
// ============================================================================

/**
 * Extracts the required body payload type for a given endpoint.
 * Example: `type CatPayload = RequestBody<"POST /api/v1/categories">;`
 */
export type RequestBody<K extends keyof ApiEndpointBodyMap> = ApiEndpointBodyMap[K];

/**
 * Extracts the query parameter type for a given endpoint.
 * Example: `type TxQuery = RequestQuery<"GET /api/v1/transactions">;`
 */
export type RequestQuery<K extends keyof ApiEndpointQueryMap> = ApiEndpointQueryMap[K];
