import type { Routes } from "@angular/router";
import { HomeComponent } from "./home";
import { MainComponent } from "./layouts/Main.component";
import DashboardGuard from "./guards/dashboard.guard";

export const routes: Routes = [
  {
    path: "",
    component: MainComponent,
    children: [
      { path: "", pathMatch: "full", component: HomeComponent },
      {
        path: "login",
        loadComponent: () => import("./login/components/login.component"),
      },
    ],
  },
  {
    path: "",
    canActivateChild: [DashboardGuard],
    loadComponent: () => import("./layouts/Dashboard.component"),
    loadChildren: () => import("./dashboard/dashboard.routes").then((m) => m.DASHBOARD_ROUTES),
  },
];
