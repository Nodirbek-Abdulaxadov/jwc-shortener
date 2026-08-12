import type { AppEnvironment } from './environment.model';

export const environment: AppEnvironment = {
  production: true,
  apiBaseUrl: 'https://1kb.uz',
  oidc: {
    authority: 'https://platform.musanna.uz',
    clientId: 'shortener-spa',
    redirectUrl: 'https://1kb.uz/app/auth/callback',
    postLogoutRedirectUri: 'https://1kb.uz/app/',
  },
};
