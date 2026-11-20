import { isPlatformBrowser } from "@angular/common";
import { PLATFORM_ID, inject } from "@angular/core";

/**
 * Data stores fetch their initial state when they are first injected. During
 * SSR/prerendering there is no user session, so those requests would fail with
 * a 401. Stores use this guard to stay on their initial (empty) state while
 * rendering on the server and load the real data in the browser.
 */
export const isBrowserPlatform = (): boolean => isPlatformBrowser(inject(PLATFORM_ID));
