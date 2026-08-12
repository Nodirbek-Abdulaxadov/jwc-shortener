import type { AppEnvironment } from './environment.model';

/**
 * Dev values. The ports are not arbitrary:
 *
 * - **8080** — the JWC service (`jwc run`), which serves the API and the
 *   public redirects.
 * - **5246** — musanna-platform's own `launchSettings.json` http profile.
 * - **4400** — this SPA. It has to match the `shortener-spa` client's
 *   `RedirectUris` in musanna's `appsettings.Development.json` and its
 *   `Cors:Origins`, or the login stops with `invalid_redirect_uri` and the
 *   only place the error shows up is the browser.
 *
 * No secret here, and there cannot be one: `shortener-spa` is a public OIDC
 * client using PKCE. Anything shipped to a browser is not a secret.
 */
export const environment: AppEnvironment = {
  production: false,
  apiBaseUrl: 'http://localhost:8080',
  oidc: {
    authority: 'http://localhost:5246',
    clientId: 'shortener-spa',
    redirectUrl: 'http://localhost:4400/auth/callback',
    postLogoutRedirectUri: 'http://localhost:4400/',
  },
};
