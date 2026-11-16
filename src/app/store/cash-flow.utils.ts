import type { LegacyCashFlowItem } from "@app/models";

export function isValidMonth(month: string): boolean {
  return /^(0[1-9]|1[0-2])$/.test(month);
}

export const findTransactionIndex = (cashFlow: LegacyCashFlowItem[], month: string) => {
  return cashFlow.findIndex((transaction) => transaction.month === month);
};

export const updateExistingTransaction = (
  cashFlow: LegacyCashFlowItem[],
  index: number,
  transaction: LegacyCashFlowItem,
) => {
  cashFlow[index] = transaction;
};

export const addNewTransaction = (
  cashFlow: LegacyCashFlowItem[],
  transaction: LegacyCashFlowItem,
) => {
  cashFlow.push(transaction);
};
