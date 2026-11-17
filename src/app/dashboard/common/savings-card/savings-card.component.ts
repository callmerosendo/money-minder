import { CurrencyPipe } from "@angular/common";
import { Component, input } from "@angular/core";
import type { Saving } from "@app/models";
import { moneyToNumber } from "@app/utils";

@Component({
  selector: "app-savings-card",
  imports: [CurrencyPipe],
  templateUrl: "./savings-card.component.html",
})
export class SavingsCardComponent {
  saving = input.required<Saving>();

  calculateProgress(saving: Saving): number {
    const target = moneyToNumber(saving.target_amount);
    if (!target) return 0;

    const progress = Math.round((moneyToNumber(saving.current_amount) / target) * 100);
    return progress > 100 ? 100 : progress;
  }
}
