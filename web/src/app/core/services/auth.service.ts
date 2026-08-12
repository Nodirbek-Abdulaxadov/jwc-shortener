import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { OidcSecurityService } from 'angular-auth-oidc-client';
import { catchError, firstValueFrom, of, switchMap } from 'rxjs';

import { environment } from '../../../environments/environment';

export interface User {
  name: string;
  email: string;
  sub: string;
  roles: string[];
}

export interface RegisterRequest {
  phone: string;
  password: string;
  firstName: string;
  lastName?: string | null;
  email?: string | null;
}

export interface RegisterResult {
  userId: string;
  /** Development only — musanna returns the SMS code instead of sending it. */
  phoneConfirmationCode?: string | null;
}

const ADMIN_ROLE = 'SuperAdmin';

/**
 * Identity for the app, backed by musanna-platform.
 *
 * Two halves that are easy to confuse:
 *
 * - **`signIn` / `register`** talk to musanna's JSON identity API with a
 *   COOKIE (`credentials: include`). They establish a platform session.
 * - **`authorize`** then runs the OIDC redirect. musanna's `/connect/authorize`
 *   finds that cookie and hands back a code without showing a login page —
 *   which matters because `Identity:LoginUrl` points at the portal SPA on
 *   :4200, and that is not part of this stack.
 *
 * The access token itself is owned by `angular-auth-oidc-client`; nothing
 * here stores it.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly oidc = inject(OidcSecurityService);
  private readonly http = inject(HttpClient);

  private readonly claims = signal<Record<string, unknown> | null>(null);

  readonly user = computed<User | null>(() => {
    const c = this.claims();
    if (!c) {
      return null;
    }
    const role = c['role'];
    return {
      sub: String(c['sub'] ?? ''),
      name: String(c['name'] ?? c['given_name'] ?? c['sub'] ?? ''),
      email: String(c['email'] ?? c['phone_number'] ?? ''),
      // A repeated claim arrives as a bare string when there is one value and
      // an array when there are several; both shapes have to work or an admin
      // silently loses the admin menu the moment they gain a second role.
      roles: Array.isArray(role) ? role.map(String) : role ? [String(role)] : [],
    };
  });

  readonly isAuthenticated = computed(() => this.user() !== null);
  readonly isAdmin = computed(() => this.user()?.roles.includes(ADMIN_ROLE) ?? false);

  readonly initials = computed(() => {
    const name = this.user()?.name;
    if (!name) {
      return '?';
    }
    return name
      .split(' ')
      .map((s) => s[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  });

  constructor() {
    this.oidc.userData$.subscribe(() => this.refreshClaims());
    this.oidc.isAuthenticated$.subscribe(() => this.refreshClaims());
  }

  /** Cookie login against musanna. Throws with the platform's message. */
  async signIn(identifier: string, password: string): Promise<{ requiresTwoFactor: boolean }> {
    const res = await firstValueFrom(
      this.http.post<{ requiresTwoFactor?: boolean }>(
        `${environment.oidc.authority}/api/identity/login`,
        { identifier, password },
        { withCredentials: true },
      ),
    );
    return { requiresTwoFactor: res?.requiresTwoFactor === true };
  }

  register(body: RegisterRequest): Promise<RegisterResult> {
    return firstValueFrom(
      this.http.post<RegisterResult>(
        `${environment.oidc.authority}/api/identity/register`,
        { ...body, locale: 'uz' },
        { withCredentials: true },
      ),
    );
  }

  confirmPhone(userId: string, code: string): Promise<unknown> {
    return firstValueFrom(
      this.http.post(
        `${environment.oidc.authority}/api/identity/confirm-phone`,
        { userId, code },
        { withCredentials: true },
      ),
    );
  }

  /** Start the OIDC redirect. Call it after `signIn` has set the cookie. */
  authorize(): void {
    this.oidc.authorize();
  }

  /**
   * Sign out in two steps, in this order:
   *
   * 1. `POST /connect/revocation` — kills the refresh token;
   * 2. `GET /connect/logout` — ends the platform session.
   *
   * Doing only the second is the common mistake and the quiet one: the screen
   * looks right, but an unrevoked refresh token stays valid for 30 days. If
   * revocation fails the sign-out continues anyway — being unable to log out
   * is worse.
   */
  logout(): void {
    this.claims.set(null);
    this.oidc
      .revokeRefreshToken()
      .pipe(
        catchError((error: unknown) => {
          console.warn('[auth] refresh token revocation failed; signing out anyway', error);
          return of(null);
        }),
        switchMap(() => this.oidc.logoff()),
      )
      .subscribe();
  }

  private refreshClaims(): void {
    this.oidc.getPayloadFromAccessToken().subscribe({
      next: (payload) => this.claims.set((payload as Record<string, unknown>) ?? null),
      error: () => this.claims.set(null),
    });
  }
}
