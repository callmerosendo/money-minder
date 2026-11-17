import { CurrencyPipe } from "@angular/common";
import { Component, computed, inject, signal } from "@angular/core";
import { toObservable, toSignal } from "@angular/core/rxjs-interop";
import { Title } from "@angular/platform-browser";

import { ChartComponent, toCategoryPieSpec } from "@app/charts";
import { NotLoggedComponent } from "@app/core";
import type { MonthlyReportResponse, SpecialsCategoryItem } from "@app/models";
import { ApiCallsService, AuthCacheService } from "@app/services";
import { subtractMoney } from "@app/utils";
import { catchError, of, switchMap, type Observable } from "rxjs";

const now = new Date();
const INITIAL_MONTH = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

@Component({
  selector: "app-analysis",
  imports: [ChartComponent, NotLoggedComponent, CurrencyPipe],
  templateUrl: "./analysis.component.html",
})
export default class AnalysisComponent {
  private readonly apiCalls = inject(ApiCallsService);
  readonly isLogged = inject(AuthCacheService).isLoggedIn;

  readonly month = signal(INITIAL_MONTH);

  private readonly params = computed(() => {
    const [year, month] = this.month().split("-");
    return { year: Number(year), month };
  });

  readonly currentYear = computed(() => this.params().year);
  readonly currentMonth = computed(() =>
    new Date(this.params().year, Number(this.params().month) - 1).toLocaleString("default", {
      month: "long",
    }),
  );

  readonly summary = this.fromMonth<MonthlyReportResponse | null>(
    (y, m) => this.apiCalls.getAnalysisSummary(y, m),
    null,
  );
  readonly entries = this.fromMonth<SpecialsCategoryItem[]>(
    (y, m) => this.apiCalls.getMonthlyEntries(y, m),
    [],
  );
  readonly exits = this.fromMonth<SpecialsCategoryItem[]>(
    (y, m) => this.apiCalls.getMonthlyExits(y, m),
    [],
  );

  readonly entriesSpec = computed(() => toCategoryPieSpec(this.entries(), "Ingresos"));
  readonly exitsSpec = computed(() => toCategoryPieSpec(this.exits(), "Egresos"));

  /** income minus expenses for the recorded month, as a money string */
  readonly net = computed(() => {
    const s = this.summary();
    return s ? subtractMoney(s.summary.income, s.summary.expenses) : "0.00";
  });

  constructor() {
    inject(Title).setTitle("Analysis | Money Minder");
  }

  onMonthChange(event: Event) {
    this.month.set((event.target as HTMLInputElement).value);
  }

  private fromMonth<T>(fetch: (year: number, month: string) => Observable<T>, initial: T) {
    return toSignal(
      toObservable(this.params).pipe(
        switchMap(({ year, month }) => fetch(year, month).pipe(catchError(() => of(initial)))),
      ),
      { initialValue: initial },
    );
  }
}
