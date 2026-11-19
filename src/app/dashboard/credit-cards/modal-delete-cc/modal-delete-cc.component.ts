import { Component, HostListener, input, output } from "@angular/core";
import type { CreditCardAccount } from "@app/models";

@Component({
  selector: "app-modal-delete-cc",
  templateUrl: "./modal-delete-cc.component.html",
})
export class ModalDeleteCcComponent {
  creditCard = input.required<CreditCardAccount>();
  delete = output<string>();
  close = output<void>();

  @HostListener("document:keydown.escape")
  onEscape(): void {
    this.close.emit();
  }

  onDelete(event?: Event) {
    // The delete form has no formGroup, so Angular does not cancel the native
    // submit; without this the browser would reload the page.
    event?.preventDefault();
    this.delete.emit(this.creditCard().id);
  }

  onClose() {
    this.close.emit();
  }
}
