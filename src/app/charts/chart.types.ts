export type ChartSpec =
  | { type: "bar"; labels: string[]; series: number[][] }
  | { type: "pie"; labels: string[]; data: number[]; title: string };

export interface ChartHandle {
  destroy(): void;
}
