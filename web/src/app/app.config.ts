import {
  ApplicationConfig,
  ErrorHandler,
  importProvidersFrom,
  provideZoneChangeDetection,
} from '@angular/core';
import { TitleStrategy, provideRouter, withComponentInputBinding } from '@angular/router';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  authInterceptor,
  provideAuth,
  withAppInitializerAuthCheck,
} from 'angular-auth-oidc-client';

import { authConfig } from './core/auth/auth.config';
import { TranslatedTitleStrategy } from './core/i18n/translated-title.strategy';
import { providePrimeNG } from 'primeng/config';
import { MessageService } from 'primeng/api';
import Aura from '@primeng/themes/aura';

import { GlobalErrorHandler } from './core/global-error-handler';
import {
  provideTanStackQuery,
  QueryClient,
} from '@tanstack/angular-query-experimental';
import { TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';

import { routes } from './app.routes';

// Runtime i18n loader — fetches public/i18n/<lang>.json (served at /i18n/).
export function createTranslateLoader(http: HttpClient): TranslateLoader {
  return new TranslateHttpLoader(http, 'i18n/', '.json');
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes, withComponentInputBinding()),
    provideAnimationsAsync(),
    // `authInterceptor()` attaches the bearer token, but only to the URLs
    // listed in `secureRoutes` — the token never goes to the IdP's own
    // /connect/* endpoints or to the i18n JSON files.
    provideHttpClient(withInterceptors([authInterceptor()])),
    // `withAppInitializerAuthCheck` processes the OIDC callback during
    // startup, so guards never see a half-known auth state.
    provideAuth(authConfig, withAppInitializerAuthCheck()),
    provideTanStackQuery(new QueryClient()),
    MessageService,
    { provide: ErrorHandler, useClass: GlobalErrorHandler },
    // Route `title`s are i18n keys; this resolves them and re-renders the
    // tab title when the language changes.
    { provide: TitleStrategy, useClass: TranslatedTitleStrategy },
    providePrimeNG({
      theme: {
        preset: Aura,
        options: {
          // Dark mode is class-based: ThemeService toggles `.app-dark` on <html>.
          darkModeSelector: '.app-dark',
          // Keep PrimeNG inside its own layer so Tailwind utilities can override.
          cssLayer: {
            name: 'primeng',
            order: 'tailwind-base, primeng, tailwind-utilities',
          },
        },
      },
    }),
    importProvidersFrom(
      TranslateModule.forRoot({
        defaultLanguage: 'en',
        loader: {
          provide: TranslateLoader,
          useFactory: createTranslateLoader,
          deps: [HttpClient],
        },
      }),
    ),
  ],
};
