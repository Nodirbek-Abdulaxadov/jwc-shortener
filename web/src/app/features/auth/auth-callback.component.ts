import { Component } from '@angular/core';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { TranslateModule } from '@ngx-translate/core';

/**
 * OIDC `redirectUrl`.
 *
 * Deliberately logic-free: `withAppInitializerAuthCheck()` exchanges the code
 * for tokens during app startup and the library then routes on to
 * `postLoginRoute`. This exists only so those few hundred milliseconds are
 * not a blank white page.
 */
@Component({
  selector: 'app-auth-callback',
  imports: [ProgressSpinnerModule, TranslateModule],
  template: `
    <div
      class="flex min-h-screen flex-col items-center justify-center gap-4 bg-surface-50 dark:bg-surface-950"
    >
      <p-progressspinner styleClass="!h-12 !w-12" strokeWidth="4" />
      <p class="text-sm text-surface-500 dark:text-surface-400">
        {{ 'auth.signing_in' | translate }}
      </p>
    </div>
  `,
})
export class AuthCallbackComponent {}
