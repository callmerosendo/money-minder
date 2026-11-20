import { isPlatformBrowser } from "@angular/common";
import { inject, Injectable, PLATFORM_ID } from "@angular/core";
import { CanActivateChild, Router } from "@angular/router";
import { AuthCacheService } from "@app/services";

@Injectable({
  providedIn: "root",
})
export default class DashboardGuard implements CanActivateChild {
  private readonly auth = inject(AuthCacheService);
  private readonly router = inject(Router);
  private readonly platformId = inject(PLATFORM_ID);

  async canActivateChild() {
    // The server has no access to the browser session cookie, so the guard
    // defers the decision to the client.
    if (!isPlatformBrowser(this.platformId)) return true;

    const user = await this.auth.ensureSession();
    return user ? true : this.router.createUrlTree(["/login"]);
  }
}
