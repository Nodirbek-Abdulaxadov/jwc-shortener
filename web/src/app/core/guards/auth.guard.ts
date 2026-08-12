import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { OidcSecurityService } from 'angular-auth-oidc-client';
import { map, take } from 'rxjs';

/**
 * Closes a route to anonymous users.
 *
 * `withAppInitializerAuthCheck()` has already processed the OIDC callback by
 * the time this runs, so there is no "don't know yet" state and a refresh
 * does not flash the login screen.
 *
 * It sends the user to our own `/login` rather than calling `authorize()`
 * straight away: musanna challenges an unauthenticated `/connect/authorize`
 * to `Identity:LoginUrl`, which is the portal on :4200 and is not running in
 * this stack. Our login page establishes the session cookie first.
 *
 * This only answers "who are you". What they may do is the backend's call —
 * the SPA never treats its own routing as protection.
 */
export const authGuard: CanActivateFn = () => {
  const oidc = inject(OidcSecurityService);
  const router = inject(Router);

  return oidc.isAuthenticated().pipe(
    take(1),
    map((authenticated) => authenticated || router.createUrlTree(['/login'])),
  );
};
