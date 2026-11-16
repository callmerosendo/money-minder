import { Chart, registerables } from "chart.js";
import { ChartHandle, ChartSpec } from "./chart.types";
import { createGraphic, createGraphicBar } from "./utils";

Chart.register(...registerables);

export function renderChart(canvas: HTMLCanvasElement, spec: ChartSpec): ChartHandle | undefined {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  switch (spec.type) {
    case "bar": {
      const [ingresos, egresos, saldo] = spec.series;
      return createGraphicBar(ctx, spec.labels, ingresos, egresos, saldo);
    }
    case "pie": {
      return createGraphic(ctx, spec.labels, spec.data, spec.title);
    }
  }
}
