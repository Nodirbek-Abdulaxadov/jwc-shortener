export interface NavItem {
  /** PrimeIcons class, e.g. 'pi pi-link'. */
  icon: string;
  /** i18n key resolved with ngx-translate. */
  labelKey: string;
  path: string;
  /** Exact route match (used for '/'). */
  exact?: boolean;
}

/** Everyone with an account. */
export const MAIN_NAV: NavItem[] = [
  { icon: 'pi pi-link', labelKey: 'nav.links', path: '/', exact: true },
];

/** Rendered only when the token carries the platform admin role. */
export const ADMIN_NAV: NavItem[] = [
  { icon: 'pi pi-chart-line', labelKey: 'nav.admin_dashboard', path: '/admin', exact: true },
  { icon: 'pi pi-list', labelKey: 'nav.admin_links', path: '/admin/links' },
  { icon: 'pi pi-users', labelKey: 'nav.admin_users', path: '/admin/users' },
  { icon: 'pi pi-ban', labelKey: 'nav.admin_hosts', path: '/admin/hosts' },
];

export const SECONDARY_NAV: NavItem[] = [
  { icon: 'pi pi-user', labelKey: 'nav.profile', path: '/profile' },
  { icon: 'pi pi-cog', labelKey: 'nav.settings', path: '/settings' },
];
