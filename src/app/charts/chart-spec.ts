import { LegacyCashFlowItem, SpecialsCategoryItem } from "@app/models";
import { ChartSpec } from "./chart.types";
import { moneyToNumber } from "@app/utils";

const MONTHS: Record<string, string> = {
  "01": "Enero",
  "02": "Febrero",
  "03": "Marzo",
  "04": "Abril",
  "05": "Mayo",
  "06": "Junio",
  "07": "Julio",
  "08": "Agosto",
  "09": "Septiembre",
  "10": "Octubre",
  "11": "Noviembre",
  "12": "Diciembre",
};

/**
 * Converts the yearly monthly series into the bar chart model.
 *
 * The API always returns twelve rows (zero-filled months included). Months
 * without any movement are skipped so the chart only shows months that
 * actually have data.
 */
export const toCashFlowBarSpec = (items: LegacyCashFlowItem[]): ChartSpec => {
  const visible = items.filter(
    (item) =>
      moneyToNumber(item.total_ingresos) !== 0 ||
      moneyToNumber(item.total_egresos) !== 0 ||
      moneyToNumber(item.total_fees) !== 0,
  );

  return {
    type: "bar",
    labels: visible.map((i) => MONTHS[i.month] ?? i.month),
    series: [
      visible.map((i) => moneyToNumber(i.total_ingresos)),
      visible.map((i) => moneyToNumber(i.total_egresos)),
      visible.map((i) => moneyToNumber(i.balance)),
    ],
  };
};

export const toCategoryPieSpec = (items: SpecialsCategoryItem[], title: string): ChartSpec => {
  return {
    type: "pie",
    labels: items.map((i) => i.categoryName),
    data: items.map((i) => moneyToNumber(i.totalAmount)),
    title,
  };
};
