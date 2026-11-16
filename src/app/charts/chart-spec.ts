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

export const toCashFlowBarSpec = (items: LegacyCashFlowItem[]): ChartSpec => {
  const ingresos = items.map((i) => moneyToNumber(i.total_ingresos));
  const egresos = items.map((i) => moneyToNumber(i.total_egresos));
  return {
    type: "bar",
    labels: items.map((i) => MONTHS[i.month] ?? i.month),
    series: [ingresos, egresos, ingresos.map((v, idx) => v - egresos[idx])],
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
