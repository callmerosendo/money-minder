import { InjectionToken, inject } from "@angular/core";
import type { Account } from "@app/models";
import { ApiCallsService } from "@app/services";
import { isBrowserPlatform } from "@app/utils";
import { patchState, signalStore, withHooks, withMethods, withState } from "@ngrx/signals";
import { firstValueFrom } from "rxjs";

type AccountsState = {
  accounts: Account[];
};

const initialState: AccountsState = {
  accounts: [],
};

const ACCOUNTS_STATE = new InjectionToken<AccountsState>("AccountsState", {
  factory: () => initialState,
});

export const AccountsStore = signalStore(
  { providedIn: "root" },
  withState(() => inject(ACCOUNTS_STATE)),
  withMethods((store, apiCallsService = inject(ApiCallsService)) => ({
    clearAccounts(): void {
      patchState(store, { accounts: initialState.accounts });
    },

    async updateAccounts(): Promise<void> {
      const accounts = await firstValueFrom(apiCallsService.getAccounts());
      patchState(store, { accounts });
    },

    /**
     * Reloads accounts from the API. Called after a mutation so balances stay
     * server-calculated.
     */
    async refresh(): Promise<void> {
      const accounts = await firstValueFrom(apiCallsService.getAccounts());
      patchState(store, { accounts });
    },

    addAccount(account: Account): void {
      patchState(store, { accounts: [...store.accounts(), account] });
    },

    editAccount(account: Account): void {
      patchState(store, {
        accounts: store
          .accounts()
          .map((current) => (current.id === account.id ? { ...current, ...account } : current)),
      });
    },

    /** Removes an archived account from the active list. */
    removeAccount(id: string): void {
      patchState(store, { accounts: store.accounts().filter((account) => account.id !== id) });
    },
  })),
  withHooks({
    async onInit(store, apiCallsService = inject(ApiCallsService)) {
      if (!isBrowserPlatform()) return;

      try {
        const accounts = await firstValueFrom(apiCallsService.getAccounts());
        patchState(store, { accounts });
      } catch (error) {
        console.error("Error fetching accounts:", error);
        patchState(store, { accounts: initialState.accounts });
      }
    },
  }),
);
