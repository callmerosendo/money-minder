import { InjectionToken, inject } from "@angular/core";
import type { DailyPhraseResponse } from "@app/models";
import { ApiCallsService } from "@app/services";
import { patchState, signalStore, withHooks, withMethods, withState } from "@ngrx/signals";
import { firstValueFrom } from "rxjs";

type QuoteState = {
  quote: DailyPhraseResponse;
};

const initialState: QuoteState = {
  quote: {
    phrase: "",
    movie: "",
    character: "",
  },
};

const QUOTE_STATE = new InjectionToken<QuoteState>("QuoteState", {
  factory: () => initialState,
});

export const QuoteStore = signalStore(
  { providedIn: "root" },
  withState(() => inject(QUOTE_STATE)),
  withMethods((store, apiCallsService = inject(ApiCallsService)) => ({
    deleteQuote(): void {
      patchState(store, { quote: initialState.quote });
    },

    async updateQuote(): Promise<void> {
      const quote = (await firstValueFrom(apiCallsService.getQuote())) ?? initialState.quote;
      patchState(store, { quote });
    },
  })),
  withHooks({
    async onInit(store, apiCallsService = inject(ApiCallsService)) {
      try {
        const quote = (await firstValueFrom(apiCallsService.getQuote())) ?? initialState.quote;
        patchState(store, { quote });
      } catch (error) {
        console.error("Error fetching quote:", error);
        patchState(store, {
          quote: { phrase: "Error fetching quote", movie: "Errorland", character: "Error" },
        });
      }
    },
  }),
);
