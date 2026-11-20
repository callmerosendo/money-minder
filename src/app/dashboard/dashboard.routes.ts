import type { Routes } from "@angular/router";

export const DASHBOARD_ROUTES: Routes = [
  { path: "dashboard", loadComponent: () => import("./dashboard/components/dashboard.component") },
  { path: "accounts", loadComponent: () => import("./accounts/accounts.component") },
  { path: "entries", loadComponent: () => import("./entries/components/entries.component") },
  { path: "exits", loadComponent: () => import("./exits/components/exits.component") },
  { path: "transfers", loadComponent: () => import("./transfers/transfers.component") },
  { path: "analysis", loadComponent: () => import("./analysis/components/analysis.component") },
  { path: "savings", loadComponent: () => import("./goals/components/goals.component") },
  { path: "reminders", loadComponent: () => import("./reminders/components/reminder.component") },
  { path: "credit-cards", loadComponent: () => import("./credit-cards/credit-cards.component") },
  { path: "debit-cards", loadComponent: () => import("./debit-cards/debit-cards.component") },
  { path: "loans", loadComponent: () => import("./loans/loans.component") },
  { path: "settings", loadComponent: () => import("./settings/settings.component") },
];
