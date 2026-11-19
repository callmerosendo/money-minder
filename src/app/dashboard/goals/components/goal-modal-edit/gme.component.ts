import { Component, EventEmitter, type OnInit, Output, input } from "@angular/core";
import { FormsModule } from "@angular/forms";
import type { Saving, UpdateSavingPayload } from "@app/models";
import { moneyToNumber } from "@app/utils";

@Component({
  selector: "app-goal-modal-edit",
  templateUrl: "./gme.component.html",
  imports: [FormsModule],
})
export class GoalModalEditComponent implements OnInit {
  goal = input.required<Saving>();
  @Output() save = new EventEmitter<UpdateSavingPayload>();
  @Output() closeModal = new EventEmitter<void>();
  formEdit: UpdateSavingPayload = {
    name: "",
    targetAmount: 0,
    currentAmount: 0,
    targetDate: "",
  };

  ngOnInit() {
    this.formEdit = {
      name: this.goal().name,
      targetAmount: moneyToNumber(this.goal().target_amount),
      currentAmount: moneyToNumber(this.goal().current_amount),
      targetDate: this.goal().target_date?.slice(0, 10) ?? "",
    };
  }

  onSave(event?: Event) {
    // The edit form has no formGroup, so Angular does not cancel the native
    // submit; without this the browser would reload the page.
    event?.preventDefault();
    this.save.emit(this.formEdit);
  }

  onCloseModal() {
    this.closeModal.emit();
  }
}
