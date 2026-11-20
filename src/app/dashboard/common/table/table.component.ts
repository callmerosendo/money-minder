import { CurrencyPipe, DatePipe } from "@angular/common";
import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  computed,
  inject,
  input,
  signal,
} from "@angular/core";

import type { Account, Transaction, UpdateTransactionPayload } from "@app/models";
import { AlertService, FormSubmitService } from "@app/services";
import {
  AccountsStore,
  LedgerRefreshService,
  TransactionCategoriesStore,
  TransactionsStore,
} from "@app/store";
import { extractApiErrorMessage } from "@app/utils";

import { ModalDeleteTransactionComponent } from "./modal-delete-transaction/modal-delete-transaction.component";
import { ModalEditTransactionComponent } from "./modal-edit-transaction/modal-edit-transaction.component";

@Component({
  selector: "app-table",
  templateUrl: "./table.component.html",
  imports: [CurrencyPipe, DatePipe, ModalEditTransactionComponent, ModalDeleteTransactionComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TableComponent {
  type = input.required<"entries" | "exits">();

  readonly store = inject(TransactionsStore);
  private readonly accountsStore = inject(AccountsStore);
  private readonly categoriesStore = inject(TransactionCategoriesStore);
  private readonly formSubmit = inject(FormSubmitService);
  private readonly alertService = inject(AlertService);
  private readonly ledgerRefresh = inject(LedgerRefreshService);

  readonly editingTransaction = signal<Transaction | null>(null);
  readonly deletingTransaction = signal<Transaction | null>(null);
  readonly isSaving = signal(false);

  readonly dataTransactions = computed<Transaction[]>(() => {
    const wanted = this.type() === "entries" ? "income" : "expense";
    return this.store.transactions().filter((transaction) => transaction.type === wanted);
  });

  readonly feature = computed<"entry" | "exit">(() =>
    this.type() === "entries" ? "entry" : "exit",
  );

  /** Active accounts the edited transaction can be moved to. */
  readonly activeAccounts = computed(() => {
    const rank = (account: Account) => (account.type === "credit_card" ? 1 : 0);

    return this.accountsStore
      .accounts()
      .filter((account) => account.isActive)
      .sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name));
  });

  /** Categories that can be attached to the transaction being edited. */
  readonly categoriesForEdit = computed(() => {
    const transaction = this.editingTransaction();
    if (!transaction) return [];

    const wanted = transaction.type === "income" ? "income" : "expense";
    return this.categoriesStore.categories().filter((category) => category.type === wanted);
  });

  openEdit(transaction: Transaction): void {
    if (transaction.reversed || this.isSaving()) return;
    this.editingTransaction.set(transaction);
  }

  closeEdit(): void {
    if (this.isSaving()) return;
    this.editingTransaction.set(null);
  }

  openDelete(transaction: Transaction): void {
    if (transaction.reversed || this.isSaving()) return;
    this.deletingTransaction.set(transaction);
  }

  closeDelete(): void {
    if (this.isSaving()) return;
    this.deletingTransaction.set(null);
  }

  saveEdit(payload: UpdateTransactionPayload): void {
    const transaction = this.editingTransaction();
    if (!transaction || this.isSaving()) return;

    this.isSaving.set(true);

    this.formSubmit.transactionUpdate(transaction.id, payload).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.editingTransaction.set(null);
        this.alertService.showSuccess({ feature: this.feature(), action: "update" });
        void this.ledgerRefresh.refreshAll();
      },
      error: (error: unknown) => {
        this.isSaving.set(false);
        this.alertService.showError({
          feature: this.feature(),
          action: "update",
          customMessage: extractApiErrorMessage(error, "No se pudo actualizar la transacción."),
        });
      },
    });
  }

  confirmDelete(): void {
    const transaction = this.deletingTransaction();
    if (!transaction || this.isSaving()) return;

    this.isSaving.set(true);

    // Hard delete removes the row instead of posting a compensating reversal.
    this.formSubmit.transactionDelete(transaction.id, true).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.deletingTransaction.set(null);
        this.alertService.showSuccess({ feature: this.feature(), action: "delete" });
        void this.ledgerRefresh.refreshAll();
      },
      error: (error: unknown) => {
        this.isSaving.set(false);
        this.alertService.showError({
          feature: this.feature(),
          action: "delete",
          customMessage: extractApiErrorMessage(error, "No se pudo eliminar la transacción."),
        });
      },
    });
  }

  @HostListener("document:keydown.escape")
  onEscape(): void {
    if (this.isSaving()) return;
    this.editingTransaction.set(null);
    this.deletingTransaction.set(null);
  }
}
