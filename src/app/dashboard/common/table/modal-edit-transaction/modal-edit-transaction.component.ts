import {
  ChangeDetectionStrategy,
  Component,
  type OnInit,
  computed,
  inject,
  input,
  output,
} from "@angular/core";
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from "@angular/forms";

import type {
  Account,
  AccountType,
  Category,
  Transaction,
  UpdateTransactionPayload,
} from "@app/models";
import { AlertService } from "@app/services";
import { isValidPositiveMoney, moneyToNumber } from "@app/utils";

interface EditTransactionForm {
  amount: FormControl<number>;
  date: FormControl<string>;
  accountId: FormControl<string>;
  categoryId: FormControl<string>;
  description: FormControl<string>;
}

const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  cash: "Efectivo",
  bank: "Banco",
  savings: "Ahorros",
  credit_card: "Tarjeta de crédito",
};

@Component({
  selector: "app-modal-edit-transaction",
  templateUrl: "./modal-edit-transaction.component.html",
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ModalEditTransactionComponent implements OnInit {
  transaction = input.required<Transaction>();
  categories = input.required<Category[]>();
  accounts = input.required<Account[]>();
  saving = input(false);

  save = output<UpdateTransactionPayload>();
  close = output<void>();

  private readonly alertService = inject(AlertService);

  readonly accountTypeLabels = ACCOUNT_TYPE_LABELS;

  /** Account the transaction currently moves, null if it has no movements. */
  readonly currentAccount = computed(() => this.transaction().movements[0]?.account ?? null);

  /**
   * The API refuses to update transactions on archived accounts, so the user
   * has to pick an active one before saving.
   */
  readonly currentAccountArchived = computed(() => this.currentAccount()?.isActive === false);

  readonly form = new FormGroup<EditTransactionForm>({
    amount: new FormControl(0, {
      nonNullable: true,
      validators: [Validators.required, Validators.min(0.01)],
    }),
    date: new FormControl("", { nonNullable: true, validators: [Validators.required] }),
    accountId: new FormControl("", { nonNullable: true, validators: [Validators.required] }),
    categoryId: new FormControl("", { nonNullable: true }),
    description: new FormControl("", {
      nonNullable: true,
      validators: [Validators.maxLength(500)],
    }),
  });

  ngOnInit(): void {
    const transaction = this.transaction();
    const currentAccountId = transaction.movements[0]?.account?.id ?? "";
    const keepCurrentAccount = this.accounts().some((account) => account.id === currentAccountId);

    this.form.setValue({
      amount: moneyToNumber(transaction.amount),
      date: transaction.occurredAt.slice(0, 10),
      accountId: keepCurrentAccount ? currentAccountId : "",
      categoryId: transaction.category?.id ?? "",
      description: transaction.description ?? "",
    });
  }

  onSubmit(): void {
    const values = this.form.getRawValue();

    if (!isValidPositiveMoney(values.amount)) {
      this.warn("El monto debe ser mayor a 0 y tener máximo dos decimales");
      return;
    }

    if (!values.date) {
      this.warn("Selecciona la fecha de la transacción");
      return;
    }

    if (!values.accountId) {
      this.warn("Selecciona una cuenta activa para guardar la transacción");
      return;
    }

    this.save.emit({
      amount: values.amount,
      occurredAt: values.date,
      accountId: values.accountId,
      categoryId: values.categoryId || null,
      description: values.description.trim(),
    });
  }

  onClose(): void {
    this.close.emit();
  }

  private warn(customMessage: string): void {
    this.alertService.showWarning({
      feature: this.transaction().type === "income" ? "entry" : "exit",
      action: "update",
      customMessage,
    });
  }
}
