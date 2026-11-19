import { Component, input, output } from "@angular/core";
import { FormsModule } from "@angular/forms";
import type { Reminder } from "@app/models";

@Component({
  selector: "app-reminder-delete",
  templateUrl: "./rmd.component.html",
  imports: [FormsModule],
})
export class ReminderDeleteComponent {
  reminder = input.required<Reminder>();
  delete = output<string>();
  close = output<void>();

  onDelete(event?: Event) {
    // The delete form has no formGroup, so Angular does not cancel the native
    // submit; without this the browser would reload the page.
    event?.preventDefault();
    this.delete.emit(this.reminder().id);
  }

  onClose() {
    this.close.emit();
  }
}
