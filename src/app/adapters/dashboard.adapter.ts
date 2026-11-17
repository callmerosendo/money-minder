import type {
  PaginatedResponse,
  SpecialsCategoryItem,
  SpecialsYearlyCategoriesResponse,
  Transaction,
  Transfer,
  TransferTransaction,
} from "../models";
import { ZERO_MONEY, addMoney } from "../utils";

const toDate = (value: string | null | undefined): string => {
  if (!value) return "";
  return value.slice(0, 10);
};

/**
 * Converts the yearly categories response into the pie chart model.
 *
 * The dashboard shows spending by category, so expenses are used. When a user
 * only has income for the year, incomes are shown instead of an empty chart.
 */
export const yearlyCategoriesAdapter = (
  data: SpecialsYearlyCategoriesResponse,
): SpecialsCategoryItem[] => {
  return data.expenses?.length ? data.expenses : (data.incomes ?? []);
};

/**
 * Groups income transactions into the per-category breakdown the pie chart
 * consumes. Mirrors what the server does for `GET /reports/expenses-by-category`,
 * which only covers expenses.
 */
export const categoryTotalsAdapter = (transactions: Transaction[]): SpecialsCategoryItem[] => {
  const totals = new Map<string, SpecialsCategoryItem>();

  for (const transaction of transactions) {
    const categoryId = transaction.category?.id ?? null;
    const categoryName = transaction.category?.name ?? "Sin categoría";
    const key = categoryId ?? categoryName;
    const existing = totals.get(key);

    if (existing) {
      existing.totalAmount = addMoney(existing.totalAmount, transaction.amount);
    } else {
      totals.set(key, { categoryId, categoryName, totalAmount: transaction.amount });
    }
  }

  return [...totals.values()];
};

/**
 * Flattens a transfer transaction into the row model used by the table.
 */
export const transferAdapter = (data: TransferTransaction): Transfer => {
  const fromAccountId = data.transfer?.fromAccountId ?? "";
  const toAccountId = data.transfer?.toAccountId ?? "";
  const fromMovement = data.movements?.find((movement) => movement.accountId === fromAccountId);
  const toMovement = data.movements?.find((movement) => movement.accountId === toAccountId);

  return {
    id: data.id,
    date: toDate(data.occurredAt),
    amount: data.amount,
    fee: data.transfer?.fee ?? ZERO_MONEY,
    description: data.description ?? null,
    fromAccountId,
    toAccountId,
    fromAccountName: fromMovement?.account?.name ?? null,
    toAccountName: toMovement?.account?.name ?? null,
    reversed: data.reversed ?? false,
  };
};

export const paginatedTransfersAdapter = (
  data: PaginatedResponse<TransferTransaction>,
): PaginatedResponse<Transfer> => ({
  ...data,
  items: (data.items ?? []).map(transferAdapter),
});
