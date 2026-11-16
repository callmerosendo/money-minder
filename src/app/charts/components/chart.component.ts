import { Component, DestroyRef, effect, ElementRef, inject, input, viewChild } from "@angular/core";
import { ChartHandle, ChartSpec } from "../chart.types";
import { renderChart } from "../chart-renderer";

@Component({
  selector: "app-chart",
  templateUrl: "./chart.component.html",
})
export class ChartComponent {
  spec = input.required<ChartSpec>();
  private canvas = viewChild.required<ElementRef<HTMLCanvasElement>>("canvas");
  private handle: ChartHandle | undefined;

  constructor() {
    effect(() => {
      const spec = this.spec();
      this.handle?.destroy();
      this.handle = renderChart(this.canvas().nativeElement, spec);
    });
    inject(DestroyRef).onDestroy(() => this.handle?.destroy());
  }
}
