import { LogLevel, PassedInitialConfig } from 'angular-auth-oidc-client';

import { environment } from '../../../environments/environment';

/**
 * Scopes this SPA asks musanna-platform for:
 *
 * - `openid profile email` — who the user is;
 * - `offline_access` — refresh token. Without it the session would die with
 *   the 15-minute access token and the user would be bounced to login again;
 * - `shortener.api` — the API itself. It is what puts `aud: musanna.shortener`
 *   in the token, and the JWC service rejects anything without it.
 */
const SCOPES = ['openid', 'profile', 'email', 'offline_access', 'shortener.api'].join(' ');

export const authConfig: PassedInitialConfig = {
  config: {
    authority: environment.oidc.authority,
    redirectUrl: environment.oidc.redirectUrl,
    postLogoutRedirectUri: environment.oidc.postLogoutRedirectUri,
    clientId: environment.oidc.clientId,
    scope: SCOPES,
    responseType: 'code',

    // Refresh-token renewal rather than a hidden iframe: browsers that block
    // third-party cookies fail the iframe silently, and you only find out
    // when a user says they keep getting signed out.
    silentRenew: true,
    useRefreshToken: true,
    ignoreNonceAfterRefresh: true,
    renewTimeBeforeTokenExpiresInSeconds: 60,

    // The bearer token is attached to the JWC API only. The authority is
    // deliberately absent: `/connect/token` and the discovery document must
    // never receive an access token, and the login/register calls go to
    // musanna with a cookie, not a bearer.
    secureRoutes: [environment.apiBaseUrl],

    // `userinfo` is not called — the access token already carries name and
    // email, and a second source would just raise "which one is right?".
    autoUserInfo: false,

    postLoginRoute: '/',
    forbiddenRoute: '/forbidden',
    unauthorizedRoute: '/login',

    logLevel: environment.production ? LogLevel.Error : LogLevel.Warn,
  },
};
