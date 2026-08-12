import { Routes } from '@angular/router';

import { adminGuard } from './core/guards/admin.guard';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./layout/app-layout.component').then((m) => m.AppLayoutComponent),
    canActivate: [authGuard],
    children: [
      {
        path: '',
        loadComponent: () => import('./features/links/links.component').then((m) => m.LinksComponent),
        title: 'title.links',
      },
      {
        path: 'profile',
        loadComponent: () => import('./features/profile/profile.component').then((m) => m.ProfileComponent),
        title: 'title.profile',
      },
      {
        path: 'settings',
        loadComponent: () => import('./features/settings/settings.component').then((m) => m.SettingsComponent),
        title: 'title.settings',
      },

      // Admin area. The guard is cosmetic — the API re-checks the role.
      {
        path: 'admin',
        canActivate: [adminGuard],
        loadComponent: () =>
          import('./features/admin/admin-dashboard.component').then((m) => m.AdminDashboardComponent),
        title: 'title.admin_dashboard',
      },
      {
        path: 'admin/links',
        canActivate: [adminGuard],
        loadComponent: () =>
          import('./features/admin/admin-links.component').then((m) => m.AdminLinksComponent),
        title: 'title.admin_links',
      },
      {
        path: 'admin/users',
        canActivate: [adminGuard],
        loadComponent: () =>
          import('./features/admin/admin-users.component').then((m) => m.AdminUsersComponent),
        title: 'title.admin_users',
      },
      {
        path: 'admin/hosts',
        canActivate: [adminGuard],
        loadComponent: () =>
          import('./features/admin/admin-hosts.component').then((m) => m.AdminHostsComponent),
        title: 'title.admin_hosts',
      },
    ],
  },
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login.component').then((m) => m.LoginComponent),
    title: 'title.login',
  },
  {
    // OIDC redirect target. The code exchange happens in the app initializer;
    // this route only exists so the wait is not a blank page.
    path: 'auth/callback',
    loadComponent: () =>
      import('./features/auth/auth-callback.component').then((m) => m.AuthCallbackComponent),
    title: 'title.callback',
  },
  {
    path: 'forbidden',
    loadComponent: () =>
      import('./features/auth/forbidden.component').then((m) => m.ForbiddenComponent),
    title: 'title.forbidden',
  },
  {
    path: '**',
    loadComponent: () => import('./features/not-found/not-found.component').then((m) => m.NotFoundComponent),
    title: 'title.not_found',
  },
];
