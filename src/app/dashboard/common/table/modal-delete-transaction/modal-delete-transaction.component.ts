import { CurrencyPipe } from "@angular/common";
import { ChangeDetectionStrategy, Component, input, output } from "@angular/core";

import type { Transaction } from "@app/models";

@Component({
  selector: "app-modal-delete-transaction",
  templateUrl: "./modal-delete-transaction.component.html",
  imports: [CurrencyPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ModalDeleteTransactionComponent {
  transaction = input.required<Transaction>();
  deleting = input(false);

  confirm = output<void>();
  close = output<void>();

  onDelete(event?: Event): void {
    // The confirmation form has no formGroup, so Angular does not cancel the
    // native submit; without this the browser would reload the page.
    event?.preventDefault();
    this.confirm.emit();
  }

  onClose(): void {
    this.close.emit();
  }
}
