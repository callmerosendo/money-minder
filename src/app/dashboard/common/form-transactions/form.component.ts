import { Component, type Signal, computed, inject, input, output } from "@angular/core";
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from "@angular/forms";
import { SubmitBttnComponent } from "@app/core";
import type { CreateTransactionPayload, TemplateForm, Transaction } from "@app/models";
import { AlertService, FormSubmitService } from "@app/services";
import {
  AccountsStore,
  CashFlowStore,
  CreditCardsStore,
  FinancialSummaryStore,
  TransactionCategoriesStore,
  TransactionsStore,
} from "@app/store";

@Component({
  selector: "app-form",
  templateUrl: "./form.component.html",
  imports: [ReactiveFormsModule, SubmitBttnComponent],
})
export class FormComponent {
  formSubmitted = output<void>();
  type = input.required<"entries" | "exits">();

  formSubmit = inject(FormSubmitService);
  readonly transactionsStore = inject(TransactionsStore);
  readonly financialSummaryStore = inject(FinancialSummaryStore);
  readonly cashFlowStore = inject(CashFlowStore);
  readonly creditCardsStore = inject(CreditCardsStore);
  readonly accountsStore = inject(AccountsStore);
  readonly transactionCategoriesStore = inject(TransactionCategoriesStore);
  readonly alertService = inject(AlertService);

  form: Signal<FormGroup> = computed(() => this.buildForm());

  /** Accounts a transaction can be posted against. Credit cards have their own flow. */
  readonly accounts = computed(() =>
    this.accountsStore
      .accounts()
      .filter((account) => account.isActive && account.type !== "credit_card"),
  );

  readonly creditCards = this.creditCardsStore.creditCards;

  /** Server categories matching the direction of the form. */
  readonly categoriesForType = computed(() => {
    const wanted = this.type() === "entries" ? "income" : "expense";
    return this.transactionCategoriesStore
      .categories()
      .filter((category) => category.type === wanted);
  });

  private buildForm() {
    return new FormGroup<TemplateForm>({
      date: new FormControl("", { nonNullable: true, validators: [Validators.required] }),
      amount: new FormControl(0, { nonNullable: true, validators: [Validators.required] }),
      category: new FormControl("", { nonNullable: true, validators: [Validators.required] }),
      description: new FormControl("", { nonNullable: true }),
      isCreditPayment: new FormControl(false, { nonNullable: true }),
      creditCardId: new FormControl("", { nonNullable: true }),
      accountId: new FormControl("", { nonNullable: true }),
    });
  }

  onSubmit() {
    if (this.form().invalid) {
      this.handleInvalidForm();
      return;
    }
    this.submitForm(this.type() === "entries" ? "entry" : "exit");
  }

  /** An expense paid with a credit card is posted against the card's account. */
  private usesCreditCard(type: "entry" | "exit"): boolean {
    return type === "exit" && Boolean(this.form().get("isCreditPayment")?.value);
  }

  private handleInvalidForm() {
    if (!this.form().get("category")?.value) {
      this.showCategoryAlert();
    }
    if (this.usesCreditCard("exit") && !this.form().get("creditCardId")?.value) {
      this.showCreditCardAlert();
    }
    if (!this.usesCreditCard("exit") && !this.form().get("accountId")?.value) {
      this.showAccountAlert();
    }
  }

  private showCategoryAlert() {
    this.alertService.showWarning({
      feature: this.type() === "entries" ? "entry" : "exit",
      action: "create",
      customMessage: "Tienes que agregar una categoría",
    });
  }

  private showCreditCardAlert() {
    this.alertService.showInfo({
      feature: "exit",
      action: "create",
      customMessage: "Antes debes agregar una Tarjeta de Crédito",
    });
  }

  private showAccountAlert() {
    this.alertService.showWarning({
      feature: this.type() === "entries" ? "entry" : "exit",
      action: "create",
      customMessage: "Tienes que agregar una cuenta",
    });
  }

  private submitForm(type: "entry" | "exit") {
    const formData = this.form().value;
    const accountId = this.resolveAccountId(type, formData);

    if (!accountId) {
      this.showAccountAlert();
      return;
    }

    const payload: CreateTransactionPayload = {
      type: type === "entry" ? "income" : "expense",
      amount: Number(formData.amount),
      accountId,
      categoryId: formData.category || undefined,
      description: formData.description || undefined,
      occurredAt: formData.date,
    };

    this.formSubmit.transactionSubmit(payload).subscribe({
      next: (transaction) => this.handleSuccess(transaction),
      error: () => this.handleError(),
    });
  }

  private resolveAccountId(type: "entry" | "exit", formData: TemplateFormValue): string {
    if (this.usesCreditCard(type)) {
      const card = this.creditCards().find((item) => item.id === formData.creditCardId);
      return card?.accountId ?? "";
    }

    return formData.accountId ?? "";
  }

  private handleSuccess(transaction: Transaction) {
    this.alertService.showSuccess({
      feature: this.type() === "entries" ? "entry" : "exit",
      action: "create",
    });
    this.updateStores(transaction);
    this.resetForm();
    this.formSubmitted.emit();
  }

  private handleError() {
    this.alertService.showError({
      feature: this.type() === "entries" ? "entry" : "exit",
      action: "fetch",
    });
  }

  private updateStores(transaction: Transaction) {
    const currentYear = new Date().getFullYear();
    const transactionDate = new Date(transaction.occurredAt);
    const transactionYear = transactionDate.getFullYear();
    const transactionMonth = (transactionDate.getMonth() + 1).toString().padStart(2, "0");
    const isEntry = transaction.type === "income";

    this.transactionsStore.addTransaction(transaction);

    if (transaction.type === "income" || transaction.type === "expense") {
      this.transactionsStore.addRecentTransaction({
        id: transaction.id,
        type: transaction.type,
        amount: transaction.amount,
        category: transaction.category?.name ?? "Sin categoría",
        date: transaction.occurredAt.slice(0, 10),
        description: transaction.description,
        creditCard: null,
      });
    }

    if (transaction.affectsLiability) {
      void this.creditCardsStore.updatePurchases();
      void this.creditCardsStore.updateCardTransactions();
    }

    if (transactionYear !== currentYear) return;

    if (isEntry) {
      this.financialSummaryStore.addSummaryEntry(transaction.amount);
      this.cashFlowStore.addEntryTransaction(transactionMonth, transaction.amount);
      return;
    }

    this.financialSummaryStore.addSummaryExit(transaction.amount);
    this.cashFlowStore.addExitTransaction(transactionMonth, transaction.amount);
  }

  private resetForm() {
    this.form().reset({
      date: "",
      amount: 0,
      category: "",
      description: "",
      isCreditPayment: false,
      creditCardId: "",
      accountId: "",
    });
  }
}

/** The value shape produced by `TemplateForm` once every control is read. */
type TemplateFormValue = {
  [K in keyof TemplateForm]: TemplateForm[K]["value"];
};
