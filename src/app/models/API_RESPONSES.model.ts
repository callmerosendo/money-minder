/**
 * Money Minder API — Frontend TypeScript Response Interfaces
 * Based on docs/BACKEND_API.md and backend implementation
 */

// ============================================================================
// 0. COMMON & PRIMITIVE TYPES
// ============================================================================

/** Money amounts are always formatted as decimal strings (e.g. "1250.00") */
export type MoneyString = string;

/** ISO-8601 UTC date-time string (e.g. "2026-11-09T10:00:00.000Z") */
export type ISODateTimeString = string;

/** ISO-8601 date-only string (e.g. "2026-11-09") */
export type ISODateString = string;

export type AccountType = "cash" | "bank" | "savings" | "credit_card";
export type TransactionType = "income" | "expense" | "transfer" | "adjustment";
export type CategoryType = "income" | "expense";
export type OAuthProvider = "google" | "github";
export type LoanDirection = "borrowed" | "lent";
export type LoanStatus = "active" | "paid";
export type ReminderRecurrence = "none" | "monthly" | "yearly";
export type ReminderStatus = "pending" | "done";

/**
 * Standard pagination response wrapper used by transactions, transfers, debit cards, etc.
 */
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * Global API Error Response shape returned by AllExceptionsFilter
 */
export interface ApiErrorResponse {
  statusCode: number;
  timestamp: ISODateTimeString;
  path: string;
  message: string | string[];
}

/** GET /health */
export interface HealthCheckResponse {
  status: "ok";
}

// ============================================================================
// 1. AUTH & USER PROFILES
// ============================================================================

/** GET /api/v1/users/me, PATCH /api/v1/users/me */
export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatar_url: string | null;
  created_at: ISODateTimeString;
}

export interface UserOAuthAccount {
  provider: OAuthProvider;
  provider_user_id: string;
}

/** GET /api/v1/auth/me */
export interface CurrentAuthUser extends UserProfile {
  oauth_accounts: UserOAuthAccount[];
}

// ============================================================================
// 2. ACCOUNTS
// ============================================================================

/**
 * Represents a standard ledger account (cash, bank, savings, or credit_card).
 * GET /api/v1/accounts
 * GET /api/v1/accounts/balances
 * POST /api/v1/accounts
 * GET /api/v1/accounts/:id
 * PATCH /api/v1/accounts/:id
 * GET /api/v1/accounts/:id/balance
 */
export interface Account {
  id: string;
  name: string;
  type: AccountType;
  openingBalance: MoneyString;
  openingBalanceDate: ISODateTimeString;
  isActive: boolean;
  movementsTotal: MoneyString;
  balance: MoneyString;
  /** Non-null string for type === 'credit_card', null for asset accounts */
  outstandingDebt: MoneyString | null;
}

/** POST /api/v1/accounts/:id/archive and DELETE /api/v1/accounts/:id (soft) */
export interface ArchiveAccountResponse {
  archived: true;
  id: string;
}

/** DELETE /api/v1/accounts/:id?hard=true */
export interface HardDeleteAccountResponse {
  deleted: true;
  id: string;
}

/** GET /api/v1/accounts/:id/balances */
export interface DailyBalance {
  day: ISODateString; // "YYYY-MM-DD"
  balance: MoneyString;
}

/** Item in GET /api/v1/accounts/:id/transactions */
export interface AccountHistoryItem {
  transaction_id: string;
  type: TransactionType;
  occurred_at: ISODateTimeString;
  transaction_amount: MoneyString;
  description: string | null;
  movement_id: string;
  movement_amount: MoneyString;
  running_balance: MoneyString;
}

/** GET /api/v1/accounts/:id/transactions */
export interface AccountHistoryResponse {
  accountId: string;
  openingBalance: MoneyString;
  openingBalanceDate: ISODateTimeString;
  items: AccountHistoryItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ============================================================================
// 3. CATEGORIES
// ============================================================================

/**
 * GET /api/v1/categories
 * POST /api/v1/categories
 * PATCH /api/v1/categories/:id
 */
export interface Category {
  id: string;
  /** null for global preset categories; string UUID for user-created categories */
  user_id: string | null;
  name: string;
  type: CategoryType;
}

/** DELETE /api/v1/categories/:id */
export interface DeleteCategoryResponse {
  deleted: true;
}

// ============================================================================
// 4. TRANSACTIONS & TRANSFERS
// ============================================================================

export interface TransactionCategoryRef {
  id: string;
  name: string;
  type: CategoryType;
}

export interface TransactionAccountRef {
  id: string;
  name: string;
  type: AccountType;
  isActive: boolean;
}

/**
 * Signed ledger movement attached to a transaction.
 * GET /api/v1/transactions/:id/movements
 * GET /api/v1/transfers/:transactionId/movements
 */
export interface TransactionMovement {
  id: string;
  accountId: string;
  /** Signed ledger delta (e.g. "-42.50" or "+42.50") */
  amount: MoneyString;
  account: TransactionAccountRef | null;
}

/**
 * Transfer metadata populated when transaction.type === "transfer"
 */
export interface TransferDetails {
  transactionId: string;
  fromAccountId: string;
  toAccountId: string;
  fee: MoneyString;
}

/**
 * Core transaction entity returned by:
 * POST /api/v1/transactions
 * GET /api/v1/transactions
 * GET /api/v1/transactions/:id
 * PATCH /api/v1/transactions/:id
 * POST /api/v1/transactions/:id/reverse
 * DELETE /api/v1/transactions/:id (default reversal returns the compensating transaction)
 */
export interface Transaction {
  id: string;
  type: TransactionType;
  amount: MoneyString;
  description: string | null;
  occurredAt: ISODateTimeString;
  createdAt: ISODateTimeString;
  /** null for adjustment transactions or uncategorized items */
  category: TransactionCategoryRef | null;
  movements: TransactionMovement[];
  /** Populated for type === 'transfer', null for income/expense/adjustment */
  transfer: TransferDetails | null;
  reversed: boolean;
  /** UUID of the original transaction if this is a reversal adjustment; null otherwise */
  reversalOf: string | null;
  /** True if any associated movement touches a credit card account */
  affectsLiability: boolean;
}

/**
 * Dedicated type for transfers where `transfer` is guaranteed non-null.
 * POST /api/v1/transfers
 * GET /api/v1/transfers
 * GET /api/v1/transfers/:transactionId
 * PATCH /api/v1/transfers/:transactionId
 * POST /api/v1/transfers/:transactionId/reverse
 */
export interface TransferTransaction extends Transaction {
  type: "transfer";
  category: null;
  transfer: TransferDetails;
}

/** DELETE /api/v1/transactions/:id?hard=true or DELETE /api/v1/transfers/:transactionId?hard=true */
export interface HardDeleteTransactionResponse {
  deleted: true;
  transactionId: string;
}

// ============================================================================
// 5. CREDIT CARDS
// ============================================================================

export interface PaymentAccountRef {
  id: string;
  name: string;
  type: AccountType;
}

/**
 * POST /api/v1/credit-cards
 * GET /api/v1/credit-cards
 * GET /api/v1/credit-cards/:accountId
 * GET /api/v1/credit-cards/:accountId/summary
 * PATCH /api/v1/credit-cards/:accountId
 */
export interface CreditCardAccount {
  id: string;
  accountId: string;
  name: string | null;
  type: "credit_card";
  isActive: boolean;
  last4: string | null;
  creditLimit: MoneyString;
  statementDay: number;
  dueDay: number;
  paymentAccountId: string | null;
  paymentAccount: PaymentAccountRef | null;
  openingBalance: MoneyString;
  openingBalanceDate: ISODateTimeString | null;
  outstandingDebt: MoneyString;
  availableCredit: MoneyString;
}

/**
 * GET /api/v1/credit-cards/purchases
 * GET /api/v1/credit-cards/:accountId/purchases
 */
export interface CreditCardPurchasesSummary {
  id: string;
  name: string;
  statementDay: number;
  dueDay: number;
  creditLimit: MoneyString;
  startDate: ISODateString; // "YYYY-MM-DD"
  endDate: ISODateString; // "YYYY-MM-DD"
  dueDate: ISODateString; // "YYYY-MM-DD"
  totalSpent: MoneyString;
  outstandingDebt: MoneyString;
  availableCredit: MoneyString;
}

// ============================================================================
// 6. DEBIT CARDS
// ============================================================================

export interface DebitCardAccountRef {
  id: string;
  name: string;
  type: AccountType;
}

/**
 * POST /api/v1/debit-cards
 * GET /api/v1/debit-cards (items)
 * GET /api/v1/debit-cards/:id
 * PATCH /api/v1/debit-cards/:id
 */
export interface DebitCard {
  id: string;
  name: string;
  last4: string | null;
  createdAt: ISODateTimeString;
  account: DebitCardAccountRef | null;
  accountId: string;
}

/** DELETE /api/v1/debit-cards/:id */
export interface DeleteDebitCardResponse {
  deleted: true;
  id: string;
}

// ============================================================================
// 7. REPORTS
// ============================================================================

export interface ReportSummaryCounts {
  income: number;
  expenses: number;
  adjustments: number;
}

export interface ReportSummary {
  from: ISODateTimeString;
  to: ISODateTimeString;
  income: MoneyString;
  expenses: MoneyString;
  transferFees: MoneyString;
  expensesIncludingTransferFees: MoneyString;
  net: MoneyString;
  adjustments: MoneyString;
  counts: ReportSummaryCounts;
}

/**
 * Breakdown line item returned in reports and GET /api/v1/reports/expenses-by-category
 */
export interface ExpenseCategoryBreakdownItem {
  /** null for uncategorized or pseudo-category transfer fees */
  categoryId: string | null;
  categoryName: string;
  totalAmount: MoneyString;
  count: number;
  isTransferFee: boolean;
}

/** Month item for yearly series */
export interface MonthlySeriesItem {
  month: string; // "YYYY-MM"
  income: MoneyString;
  expenses: MoneyString;
  transferFees: MoneyString;
  net: MoneyString;
}

/** GET /api/v1/reports/monthly */
export interface MonthlyReportResponse {
  period: {
    type: "monthly";
    year: number;
    month: number;
    from: ISODateTimeString;
    to: ISODateTimeString;
  };
  summary: ReportSummary;
  expensesByCategory: ExpenseCategoryBreakdownItem[];
}

/** GET /api/v1/reports/yearly */
export interface YearlyReportResponse {
  period: {
    type: "yearly";
    year: number;
    from: ISODateTimeString;
    to: ISODateTimeString;
  };
  summary: ReportSummary;
  monthly: MonthlySeriesItem[];
  expensesByCategory: ExpenseCategoryBreakdownItem[];
}

/** GET /api/v1/reports/range */
export interface RangeReportResponse {
  period: {
    type: "custom";
    from: ISODateTimeString;
    to: ISODateTimeString;
  };
  summary: ReportSummary;
  expensesByCategory: ExpenseCategoryBreakdownItem[];
}

/** GET /api/v1/reports/account-balances */
export interface AccountBalancesReportResponse {
  asOf: ISODateTimeString;
  accounts: Array<{
    id: string;
    name: string;
    type: AccountType;
    openingBalance: MoneyString;
    openingBalanceDate: ISODateTimeString;
    movementsTotal: MoneyString;
    balance: MoneyString;
    outstandingDebt: MoneyString | null;
    isActive: boolean;
  }>;
  totals: {
    assets: MoneyString;
    creditCardDebt: MoneyString;
    netWorth: MoneyString;
  };
}

/** GET /api/v1/reports/credit-cards */
export interface CreditCardReportResponse {
  cards: Array<{
    accountId: string;
    name: string;
    last4: string | null;
    creditLimit: MoneyString;
    outstandingDebt: MoneyString;
    availableCredit: MoneyString;
    statementDay: number;
    dueDay: number;
    paymentAccountId: string | null;
  }>;
  totals: {
    creditLimit: MoneyString;
    outstandingDebt: MoneyString;
    availableCredit: MoneyString;
  };
}

/**
 * GET /api/v1/reports/cash-flow and GET /api/v1/specials/cash-flow
 */
export interface LegacyCashFlowItem {
  month: string; // "01", "02", ..., "12"
  total_ingresos: MoneyString;
  total_egresos: MoneyString;
  total_fees: MoneyString;
  balance: MoneyString;
}

// ============================================================================
// 8. DASHBOARD SPECIALS (LEGACY COMPATIBILITY)
// ============================================================================

/** GET /api/v1/specials/financial-summary-yearly */
export interface SpecialsFinancialSummaryYearly {
  year: number;
  totalEntries: MoneyString;
  totalExits: MoneyString;
  netBalance: MoneyString;
}

/** GET /api/v1/specials/financial-summary-monthly */
export interface SpecialsFinancialSummaryMonthly {
  month: number;
  year: number;
  totalEntries: MoneyString;
  totalExits: MoneyString;
  netBalance: MoneyString;
}

export interface SpecialsCategoryItem {
  categoryId: string | null;
  categoryName: string;
  totalAmount: MoneyString;
}

/** GET /api/v1/specials/yearly-categories */
export interface SpecialsYearlyCategoriesResponse {
  incomes: SpecialsCategoryItem[];
  expenses: SpecialsCategoryItem[];
}

/** GET /api/v1/specials/recent-transactions */
export interface SpecialsRecentTransactionItem {
  id: string;
  type: "income" | "expense";
  amount: MoneyString;
  category: string;
  date: ISODateString; // "YYYY-MM-DD"
  description: string | null;
  creditCard: string | null;
}

// ============================================================================
// 9. LOANS
// ============================================================================

/** Raw database record returned on create / update */
export interface LoanRecord {
  id: string;
  user_id: string;
  name: string;
  direction: LoanDirection;
  principal: MoneyString;
  interest_rate: MoneyString;
  start_date: ISODateTimeString;
  due_date: ISODateTimeString | null;
  status: LoanStatus;
}

export interface LoanPaymentHistoryItem {
  id: string;
  amount: number;
  paidAt: ISODateTimeString;
  note: string | null;
}

/** Item in GET /api/v1/loans */
export interface LoanListItem {
  id: string;
  name: string;
  direction: LoanDirection;
  principal: number;
  interestRate: number;
  startDate: ISODateString; // "YYYY-MM-DD"
  dueDate: ISODateString | null;
  status: LoanStatus;
  totalPaid: number;
  remaining: number;
  lastFivePayments: LoanPaymentHistoryItem[];
}

export interface LoanPaymentRecord {
  id: string;
  loan_id: string;
  amount: MoneyString;
  paid_at: ISODateTimeString;
  note: string | null;
}

/** GET /api/v1/loans/:loanId */
export interface LoanDetailResponse {
  id: string;
  user_id: string;
  name: string;
  direction: LoanDirection;
  principal: number;
  interest_rate: number;
  start_date: ISODateTimeString;
  due_date: ISODateTimeString | null;
  status: LoanStatus;
  loan_payments: LoanPaymentRecord[];
  totalPaid: number;
  remaining: number;
}

/** DELETE /api/v1/loans/:loanId, DELETE /api/v1/loans/:loanId/payments/:paymentId */
export interface DeleteEntityResponse {
  deleted: true;
}

// ============================================================================
// 10. REMINDERS
// ============================================================================

/**
 * POST /api/v1/reminders
 * GET /api/v1/reminders
 * GET /api/v1/reminders/:id
 * PATCH /api/v1/reminders/:id
 */
export interface Reminder {
  id: string;
  user_id: string;
  title: string;
  amount: MoneyString | null;
  due_at: ISODateTimeString;
  recurrence: ReminderRecurrence;
  status: ReminderStatus;
}

/** DELETE /api/v1/reminders/:id */
export interface DeleteReminderResponse {
  deleted: true;
}

// ============================================================================
// 11. SAVINGS
// ============================================================================

/**
 * POST /api/v1/savings
 * GET /api/v1/savings
 * GET /api/v1/savings/:id
 * PATCH /api/v1/savings/:id
 */
export interface Saving {
  id: string;
  user_id: string;
  name: string;
  target_amount: MoneyString;
  current_amount: MoneyString;
  target_date: ISODateTimeString | null;
}

/** DELETE /api/v1/savings/:id */
export interface DeleteSavingResponse {
  deleted: true;
}

// ============================================================================
// 12. PHRASES
// ============================================================================

/** GET /api/v1/phrases/daily-phrase */
export interface DailyPhraseResponse {
  phrase: string;
  movie: string;
  character: string;
}

// ============================================================================
// 13. API ENDPOINT RESPONSE MAP
// ============================================================================

/**
 * Quick mapping table for frontend HTTP clients (e.g. TanStack Query / Axios / fetch)
 */
export interface ApiEndpointResponseMap {
  // Public Smoke / Health
  "GET /hello": string;
  "GET /ping": string;
  "GET /health": HealthCheckResponse;

  // Auth & Users
  "GET /api/v1/auth/me": CurrentAuthUser;
  "GET /api/v1/users/me": UserProfile;
  "PATCH /api/v1/users/me": UserProfile;

  // Accounts
  "GET /api/v1/accounts": Account[];
  "GET /api/v1/accounts/balances": Account[];
  "POST /api/v1/accounts": Account;
  "GET /api/v1/accounts/:id": Account;
  "PATCH /api/v1/accounts/:id": Account;
  "POST /api/v1/accounts/:id/archive": ArchiveAccountResponse;
  "DELETE /api/v1/accounts/:id": ArchiveAccountResponse | HardDeleteAccountResponse;
  "GET /api/v1/accounts/:id/balance": Account;
  "GET /api/v1/accounts/:id/balances": DailyBalance[];
  "GET /api/v1/accounts/:id/transactions": AccountHistoryResponse;

  // Categories
  "GET /api/v1/categories": Category[];
  "POST /api/v1/categories": Category;
  "PATCH /api/v1/categories/:id": Category;
  "DELETE /api/v1/categories/:id": DeleteCategoryResponse;

  // Transactions
  "POST /api/v1/transactions": Transaction;
  "GET /api/v1/transactions": PaginatedResponse<Transaction>;
  "GET /api/v1/transactions/:id": Transaction;
  "GET /api/v1/transactions/:id/movements": TransactionMovement[];
  "PATCH /api/v1/transactions/:id": Transaction;
  "DELETE /api/v1/transactions/:id": Transaction | HardDeleteTransactionResponse;
  "POST /api/v1/transactions/:id/reverse": Transaction;

  // Transfers
  "POST /api/v1/transfers": TransferTransaction;
  "GET /api/v1/transfers": PaginatedResponse<TransferTransaction>;
  "GET /api/v1/transfers/:transactionId": TransferTransaction;
  "GET /api/v1/transfers/:transactionId/movements": TransactionMovement[];
  "PATCH /api/v1/transfers/:transactionId": TransferTransaction;
  "DELETE /api/v1/transfers/:transactionId": TransferTransaction | HardDeleteTransactionResponse;
  "POST /api/v1/transfers/:transactionId/reverse": TransferTransaction;

  // Credit Cards
  "POST /api/v1/credit-cards": CreditCardAccount;
  "GET /api/v1/credit-cards": CreditCardAccount[];
  "GET /api/v1/credit-cards/purchases": CreditCardPurchasesSummary[];
  "GET /api/v1/credit-cards/:accountId": CreditCardAccount;
  "GET /api/v1/credit-cards/:accountId/summary": CreditCardAccount;
  "GET /api/v1/credit-cards/:accountId/purchases": CreditCardPurchasesSummary[];
  "PATCH /api/v1/credit-cards/:accountId": CreditCardAccount;
  "POST /api/v1/credit-cards/:accountId/payments": TransferTransaction;
  "DELETE /api/v1/credit-cards/:accountId": ArchiveAccountResponse | HardDeleteAccountResponse;

  // Debit Cards
  "POST /api/v1/debit-cards": DebitCard;
  "GET /api/v1/debit-cards": PaginatedResponse<DebitCard>;
  "GET /api/v1/debit-cards/:id": DebitCard;
  "PATCH /api/v1/debit-cards/:id": DebitCard;
  "DELETE /api/v1/debit-cards/:id": DeleteDebitCardResponse;

  // Reports
  "GET /api/v1/reports/monthly": MonthlyReportResponse;
  "GET /api/v1/reports/yearly": YearlyReportResponse;
  "GET /api/v1/reports/range": RangeReportResponse;
  "GET /api/v1/reports/expenses-by-category": ExpenseCategoryBreakdownItem[];
  "GET /api/v1/reports/account-balances": AccountBalancesReportResponse;
  "GET /api/v1/reports/credit-cards": CreditCardReportResponse;
  "GET /api/v1/reports/cash-flow": LegacyCashFlowItem[];

  // Specials (Dashboard)
  "GET /api/v1/specials/financial-summary-yearly": SpecialsFinancialSummaryYearly;
  "GET /api/v1/specials/financial-summary-monthly": SpecialsFinancialSummaryMonthly;
  "GET /api/v1/specials/cash-flow": LegacyCashFlowItem[];
  "GET /api/v1/specials/yearly-categories": SpecialsYearlyCategoriesResponse;
  "GET /api/v1/specials/recent-transactions": SpecialsRecentTransactionItem[];

  // Loans
  "POST /api/v1/loans": LoanRecord;
  "GET /api/v1/loans": LoanListItem[];
  "GET /api/v1/loans/:loanId": LoanDetailResponse;
  "PATCH /api/v1/loans/:loanId": LoanRecord;
  "DELETE /api/v1/loans/:loanId": DeleteEntityResponse;
  "POST /api/v1/loans/:loanId/payments": LoanPaymentRecord;
  "PATCH /api/v1/loans/:loanId/payments/:paymentId": LoanPaymentRecord;
  "DELETE /api/v1/loans/:loanId/payments/:paymentId": DeleteEntityResponse;

  // Reminders
  "POST /api/v1/reminders": Reminder;
  "GET /api/v1/reminders": Reminder[];
  "GET /api/v1/reminders/:id": Reminder;
  "PATCH /api/v1/reminders/:id": Reminder;
  "DELETE /api/v1/reminders/:id": DeleteReminderResponse;

  // Savings
  "POST /api/v1/savings": Saving;
  "GET /api/v1/savings": Saving[];
  "GET /api/v1/savings/:id": Saving;
  "PATCH /api/v1/savings/:id": Saving;
  "DELETE /api/v1/savings/:id": DeleteSavingResponse;

  // Phrases
  "GET /api/v1/phrases/daily-phrase": DailyPhraseResponse | null;
}
