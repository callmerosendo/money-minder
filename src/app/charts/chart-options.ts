import type { ApexAxisChartSeries, ApexChart, ApexOptions } from "ng-apexcharts";
import type { ChartSpec } from "./chart.types";

const FONT_FAMILY = "Hanken Grotesk Variable, ui-sans-serif, system-ui, sans-serif";
const CHART_HEIGHT = 360;

const CASH_FLOW_COLORS = [
  "rgba(54, 162, 235, 0.85)",
  "rgba(255, 99, 132, 0.85)",
  "rgba(75, 192, 192, 1)",
];

const PIE_COLORS = [
  "rgba(75, 192, 192, 0.85)",
  "rgba(255, 159, 64, 0.85)",
  "rgba(255, 205, 86, 0.85)",
  "rgba(54, 162, 235, 0.85)",
  "rgba(153, 102, 255, 0.85)",
  "rgba(201, 203, 207, 0.85)",
  "rgba(233, 30, 99, 0.85)",
  "rgba(0, 250, 154, 0.85)",
  "rgba(255, 87, 34, 0.85)",
];

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});

const baseChart = (type: ApexChart["type"]): ApexChart => ({
  type,
  height: CHART_HEIGHT,
  fontFamily: FONT_FAMILY,
  background: "transparent",
  foreColor: "var(--color-ink-2)",
  toolbar: { show: false },
  animations: { enabled: true },
});

const toCashFlowOptions = (spec: Extract<ChartSpec, { type: "bar" }>): ApexOptions => {
  const [ingresos = [], egresos = [], saldo = []] = spec.series;
  const series: ApexAxisChartSeries = [
    { name: "Ingresos", type: "bar", data: ingresos },
    { name: "Egresos", type: "bar", data: egresos },
    { name: "Saldo Neto", type: "line", data: saldo },
  ];

  return {
    series,
    chart: baseChart("bar"),
    colors: CASH_FLOW_COLORS,
    stroke: { width: [0, 0, 2.5], curve: "smooth" },
    plotOptions: { bar: { horizontal: false, columnWidth: "55%", borderRadius: 2 } },
    dataLabels: { enabled: false },
    markers: { size: 4, strokeWidth: 0 },
    grid: { borderColor: "var(--color-rule)" },
    xaxis: {
      categories: spec.labels,
      title: { text: "Meses" },
    },
    yaxis: {
      title: { text: "Monto en $" },
      labels: { formatter: (value: number) => money.format(value) },
    },
    legend: { position: "top", horizontalAlign: "center", fontSize: "13px" },
    tooltip: {
      theme: "dark",
      shared: true,
      intersect: false,
      y: { formatter: (value: number) => money.format(value) },
    },
  };
};

const toCategoryPieOptions = (spec: Extract<ChartSpec, { type: "pie" }>): ApexOptions => ({
  series: spec.data,
  labels: spec.labels,
  chart: baseChart("pie"),
  colors: PIE_COLORS,
  dataLabels: { enabled: false },
  stroke: { width: 1 },
  legend: { position: "bottom", horizontalAlign: "center", fontSize: "13px" },
  plotOptions: {
    pie: {
      expandOnClick: false,
    },
  },
  tooltip: { theme: "dark", y: { formatter: (value: number) => money.format(value) } },
});

export const toApexOptions = (spec: ChartSpec): ApexOptions =>
  spec.type === "bar" ? toCashFlowOptions(spec) : toCategoryPieOptions(spec);
