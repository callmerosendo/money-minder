import { Component, computed, input } from "@angular/core";
import { ChartComponent as ApexChartComponent } from "ng-apexcharts";
import { toApexOptions } from "../chart-options";
import type { ChartSpec } from "../chart.types";

@Component({
  selector: "app-chart",
  imports: [ApexChartComponent],
  templateUrl: "./chart.component.html",
})
export class ChartComponent {
  readonly spec = input.required<ChartSpec>();
  readonly options = computed(() => toApexOptions(this.spec()));
}
