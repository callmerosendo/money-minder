import { AsyncPipe, CommonModule, CurrencyPipe } from "@angular/common";
import { Component, type OnInit, inject } from "@angular/core";
import { Title } from "@angular/platform-browser";

import { PieChartComponent } from "@app/charts";
import { NotLoggedComponent } from "@app/core";
import type { MonthlyReportResponse, SpecialsCategoryItem } from "@app/models";
import { ApiCallsService, AuthCacheService } from "@app/services";
import { subtractMoney } from "@app/utils";
import type { Observable } from "rxjs";

@Component({
  selector: "app-analysis",
  imports: [AsyncPipe, CommonModule, PieChartComponent, NotLoggedComponent, CurrencyPipe],
  templateUrl: "./analysis.component.html",
})
export default class AnalysisComponent implements OnInit {
  private readonly titleService;
  private readonly apiCalls;
  private readonly authCache;
  isLogged;

  currentMonth = new Date().toLocaleString("default", { month: "long" });
  currentMonthNumber = new Date().getMonth() + 1;
  currentYear = new Date().getFullYear();
  currentDate = new Date().toISOString().substring(0, 7);
  summary$!: Observable<MonthlyReportResponse>;
  monthlyEntries$!: Observable<SpecialsCategoryItem[]>;
  monthlyExits$!: Observable<SpecialsCategoryItem[]>;

  constructor() {
    this.titleService = inject(Title);
    this.apiCalls = inject(ApiCallsService);
    this.authCache = inject(AuthCacheService);
    this.isLogged = this.authCache.isLoggedIn;
  }

  ngOnInit() {
    this.titleService.setTitle("Analysis | Money Minder");
    this.getData();
  }

  onMonthChange(event: Event) {
    const input = event.target as HTMLInputElement;
    this.currentDate = input.value;
    const [year, month] = this.currentDate.split("-").map(Number);
    this.currentYear = year;
    this.currentMonthNumber = month;
    this.currentMonth = new Date(year, month - 1).toLocaleString("default", {
      month: "long",
    });

    this.getData();
  }

  /** Income minus expenses for the reported month, as a money string. */
  net(summary: MonthlyReportResponse | null | undefined): string {
    if (!summary) return "0.00";
    return subtractMoney(summary.summary.income, summary.summary.expenses);
  }

  private getData() {
    this.summary$ = this.apiCalls.getAnalysisSummary(
      this.currentYear,
      this.currentMonthNumber.toString().padStart(2, "0"),
    );
    this.monthlyEntries$ = this.apiCalls.getMonthlyEntries(
      this.currentYear,
      this.currentMonthNumber.toString().padStart(2, "0"),
    );
    this.monthlyExits$ = this.apiCalls.getMonthlyExits(
      this.currentYear,
      this.currentMonthNumber.toString().padStart(2, "0"),
    );
  }
}
