import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthService } from '../services/auth.service';

/**
 * Hides the admin area from non-admins. Cosmetic only — every
 * `/api/admin/*` route re-checks the role from the token, because a guard
 * that runs in the browser protects nothing.
 */
export const adminGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.isAdmin() || router.createUrlTree(['/forbidden']);
};
