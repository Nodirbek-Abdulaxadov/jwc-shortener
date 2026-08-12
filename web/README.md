# angular-template

Angular 19 + PrimeNG admin starter — a functional (UI/UX) rebuild of the
React/shadcn template
[`breezy-admin-starter`](https://github.com/Nodirbek-Abdulaxadov/breezy-admin-starter)
on the Angular stack.

## Stack

| Concern | Choice |
|---|---|
| Framework | Angular 19 (standalone components + signals) |
| UI kit | PrimeNG 19 + `@primeng/themes` **Aura** preset |
| Styling | Tailwind CSS 3 + `tailwindcss-primeui` (PrimeNG-aware tokens), CSS layers so utilities override the theme |
| Theming | Dark/light via `.app-dark` class (`ThemeService`, persisted) — replaces `next-themes` |
| i18n | `@ngx-translate/core` (runtime), `en` / `uz` in `public/i18n/` — replaces i18next |
| Data | `@tanstack/angular-query-experimental` — parity with the React TanStack Query layer |
| Forms | Angular Reactive Forms (+ `zod` available for schema validation) |
| Icons | PrimeIcons |
| Routing | Angular Router (lazy `loadComponent`, functional guards) |

## Develop

```bash
npm install
npm start        # ng serve -> http://localhost:4200
npm run build    # production build
```

## Migration status — complete ✅

Full UI/UX rebuild of the React template, phase by phase:

- [x] **Phase 1 — Foundation:** Angular scaffold, PrimeNG (Aura) + Tailwind +
      CSS layers, ngx-translate (en/uz), TanStack Query, dark/light theme.
- [x] **Phase 2 — App shell:** collapsible Sidebar + Topbar + Footer, language
      switcher, responsive (mobile drawer), `routerLinkActive` nav.
- [x] **Phase 3 — Core infra:** `AuthService` + `authGuard`, `MockDataService`
      (in-memory CRUD), `ToastService` (PrimeNG Toast), `GlobalErrorHandler`,
      route titles.
- [x] **Phase 4 — Components showcase:** Overview, Buttons, Forms, Inputs,
      Dialogs, Datatables, Misc.
- [x] **Phase 5 — Feature pages:** Dashboard (charts + cards), Users, Products,
      Customers (CRUD tables), Orders, CRUD Example, Reports, Calendar,
      Messages, Notifications, Settings, Profile.
- [x] **Phase 6 — Auth pages:** Login, Forgot password, 404.
- [x] **Phase 7 — Polish:** production build green, route guards, dark-mode
      tokens throughout.

### Layout

```
src/app/
  core/        services (auth, layout, language, theme, mock-data, toast),
               guards, models, global error handler
  layout/      app-layout, sidebar, topbar, footer, nav config
  features/    dashboard, users, products, orders, customers, reports,
               calendar, messages, notifications, settings, profile,
               crud-example, components-showcase/*, auth/*, not-found
  shared/      page-header, placeholder
public/i18n/   en.json, uz.json
```

Data is a mock in-memory backend (`MockDataService`) — swap it for a real
HTTP API behind the same method signatures.
