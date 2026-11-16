import { inject, InjectionToken } from "@angular/core";
import type { CreditCardAccount, CreditCardPurchasesSummary, Transaction } from "@app/models";
import { ApiCallsService } from "@app/services";
import { patchState, signalStore, withHooks, withMethods, withState } from "@ngrx/signals";
import { firstValueFrom } from "rxjs";

type CreditCardsState = {
  creditCards: CreditCardAccount[];
  purchases: CreditCardPurchasesSummary[];
  cardTransactions: Transaction[];
};

const initialState: CreditCardsState = {
  creditCards: [],
  purchases: [],
  cardTransactions: [],
};

const CREDIT_CARDS_STATE = new InjectionToken<CreditCardsState>("CreditCardsState", {
  factory: () => initialState,
});

export const CreditCardsStore = signalStore(
  { providedIn: "root" },
  withState(() => inject(CREDIT_CARDS_STATE)),
  withMethods((store, apiCallsService = inject(ApiCallsService)) => ({
    clearCreditCards(): void {
      patchState(store, {
        creditCards: initialState.creditCards,
        purchases: initialState.purchases,
        cardTransactions: initialState.cardTransactions,
      });
    },

    async updateCreditCards(): Promise<void> {
      const creditCards = await firstValueFrom(apiCallsService.getCreditCards());
      patchState(store, { creditCards });
    },

    /**
     * Reloads cards, purchases, and card transactions after a ledger mutation.
     */
    async refresh(): Promise<void> {
      const [creditCards, purchases, cardTransactions] = await Promise.all([
        firstValueFrom(apiCallsService.getCreditCards()),
        firstValueFrom(apiCallsService.getPurchases()),
        firstValueFrom(apiCallsService.getAllCardTransactions()),
      ]);
      patchState(store, { creditCards, purchases, cardTransactions });
    },

    addCreditCard(creditCard: CreditCardAccount): void {
      const updatedCreditCards = [...store.creditCards(), creditCard];
      patchState(store, { creditCards: updatedCreditCards });
    },

    deleteCreditCard(creditCardId: string): void {
      const updatedCreditCards = store.creditCards().filter((c) => c.id !== creditCardId);
      patchState(store, { creditCards: updatedCreditCards });
    },

    clearPurchases(): void {
      patchState(store, { purchases: initialState.purchases });
    },

    async updatePurchases(): Promise<void> {
      const purchases = await firstValueFrom(apiCallsService.getPurchases());
      patchState(store, { purchases });
    },

    async updateCardTransactions(): Promise<void> {
      const cardTransactions = await firstValueFrom(apiCallsService.getAllCardTransactions());
      patchState(store, { cardTransactions });
    },
  })),
  withHooks({
    async onInit(store, apiCallsService = inject(ApiCallsService)) {
      try {
        const creditCards = await firstValueFrom(apiCallsService.getCreditCards());
        const purchases = await firstValueFrom(apiCallsService.getPurchases());
        const cardTransactions = await firstValueFrom(apiCallsService.getAllCardTransactions());

        patchState(store, { creditCards, purchases, cardTransactions });
      } catch (error) {
        console.error("Error fetching Credit Cards:", error);
        patchState(store, {
          creditCards: initialState.creditCards,
          purchases: initialState.purchases,
          cardTransactions: initialState.cardTransactions,
        });
      }
    },
  }),
);
