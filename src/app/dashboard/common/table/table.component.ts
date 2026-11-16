import { CommonModule, CurrencyPipe, DatePipe } from "@angular/common";
import { Component, computed, inject, input } from "@angular/core";
import type { Transaction } from "@app/models";
import { TransactionsStore } from "@app/store";

@Component({
  selector: "app-table",
  templateUrl: "./table.component.html",
  imports: [CommonModule, DatePipe, CurrencyPipe],
})
export class TableComponent {
  type = input.required<"entries" | "exits">();

  readonly store = inject(TransactionsStore);

  readonly dataTransactions = computed<Transaction[]>(() => {
    const wanted = this.type() === "entries" ? "income" : "expense";
    return this.store.transactions().filter((transaction) => transaction.type === wanted);
  });
}
