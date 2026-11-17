export type ChartSpec =
  | { type: "bar"; labels: string[]; series: number[][]; title?: string }
  | { type: "pie"; labels: string[]; data: number[]; title?: string };
