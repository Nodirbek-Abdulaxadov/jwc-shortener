export interface AppEnvironment {
  production: boolean;
  /** JWC service base URL — where the shortener API lives. */
  apiBaseUrl: string;
  oidc: {
    authority: string;
    clientId: string;
    redirectUrl: string;
    postLogoutRedirectUri: string;
  };
}
