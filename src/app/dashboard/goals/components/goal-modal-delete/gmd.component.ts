import { Component, EventEmitter, Output, input } from "@angular/core";
import { FormsModule } from "@angular/forms";
import type { Saving } from "@app/models";

@Component({
  selector: "app-goal-modal-delete",
  templateUrl: "./gmd.component.html",
  imports: [FormsModule],
})
export class GoalModalDeleteComponent {
  saving = input.required<Saving>();
  @Output() delete = new EventEmitter<string>();
  @Output() closeModal = new EventEmitter<void>();

  onDelete(event?: Event) {
    // The delete form has no formGroup, so Angular does not cancel the native
    // submit; without this the browser would reload the page.
    event?.preventDefault();
    this.delete.emit(this.saving().id);
  }

  onCloseModal() {
    this.closeModal.emit();
  }
}
