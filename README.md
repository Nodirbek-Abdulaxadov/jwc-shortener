# jwc-shortener

URL shortener written in [JWC](https://github.com/Nodirbek-Abdulaxadov/jwc-lang) — a
clean-slate v2 built around a read-heavy (≈100:1) design: one server, Postgres + Redis,
native binary. Landing page, admin panel and API all come from the same process on
one port; authentication is OIDC against **musanna-platform**.

## Pieces

| Part | Where | Port (dev) |
|---|---|---|
| API + redirects + landing page | `main.jwc`, `views.jwc` | 8080 |
| User & admin panel (Angular 19 + PrimeNG) | `web/` | 4400 |
| Identity provider | musanna-platform (separate repo) | 5246 |

## Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/` | — | landing page (uz/en, links to the panel) |
| `GET` | `/{code}` | — | 302 redirect (404 unknown/blocked, 410 deleted/expired) |
| `GET` | `/api/stats` | — | `{links, clicks, today}` for the landing counters |
| `GET` | `/api/links/{code}` | — | `{code, url, hits, created_at}` |
| `POST` | `/api/links` | Bearer | `{url, expires_at?}` → `201 {code, short, qr}` |
| `GET` | `/api/me/links` | Bearer | own links, newest first |
| `DELETE` | `/api/me/links/{code}` | Bearer | soft delete |
| `GET` | `/api/admin/stats` | Admin | totals, 14-day series, busiest links |
| `GET` | `/api/admin/links?q=` | Admin | every link with its owner |
| `POST` | `/api/admin/links/{code}/status` | Admin | `{status: active\|blocked}` |
| `GET` | `/api/admin/users` | Admin | accounts with link and click counts |
| `GET` `POST` `DELETE` | `/api/admin/hosts[/{host}]` | Admin | destination blocklist |
| `GET` | `/healthz` `/readyz` `/metrics` | — | runtime built-ins |

"Admin" means the access token carries musanna's `SuperAdmin` role. The
Angular guard only hides the menu; every `/api/admin/*` route re-checks the
claim, and a non-admin token gets 403.

## How it works

- **Codes** — `base62((nextval * ODD mod 2^32) xor XOR)`, computed by the `next_code()`
  SQL function. Bijective: no collisions, no retry loop, sequence not observable.
  Constants live in the init migration and must never change. Always 6 chars.
- **Redirect** — one Redis round-trip: a Lua script reads the cache entry, bumps
  `hits:{floor(now/10)}`, and claims the closed-bucket flush range. Misses load from
  Postgres and cache for ≤300s; unknown codes are negative-cached for 60s so
  code-enumeration scans never reach the database.
- **Hit flush** — a native JWC binary has no background scheduler (the queue API is
  interpreter-only), so the redirect that first observes a bucket rollover drains the
  closed buckets into `link.hits` + `link_stat_daily`. One request per ~10s pays a few
  extra round-trips. A bucket is deleted only after Postgres has taken the delta.
- **Redirects are never logged per-request** — the counter is the analytics source.
- **Auth** — RS256 access tokens from musanna-platform, verified against its JWKS.
  With `JWKS_URL` unset every authed route answers 503; there is no symmetric-secret
  escape hatch.
- **Degradation** — no/broken Redis: in-process cache + per-request Postgres hit bump.
  Postgres down: cached redirects keep working.

## Running it locally (no Docker except Redis)

**1. Postgres** — a local PostgreSQL 16/17. Copy `.env.example` to `.env` and set the
`PG_*` values.

**2. Redis**

```bash
docker run -d --name jwc-shortener-redis -p 16379:6379 redis:7-alpine
```

Port 16379 rather than 6379 because 6379 is often already taken locally, and 6380 sits
in a Windows-reserved range. Without Redis the app still runs — see *Degradation*.

**3. musanna-platform** (the IdP) — from its repo:

```bash
dotnet build MusannaPlatform.slnx -m:1
dotnet run --project src/Bootstrapper/Api --launch-profile http   # http://localhost:5246
```

It needs the same Postgres; put the connection string in
`src/Bootstrapper/Api/appsettings.Development.local.json` (git-ignored). Migrations and
seeding run automatically in Development.

Two entries in that repo make this app a first-class client — both already committed:

- `appsettings.json` → `Applications[]` gains `{ "Code": "shortener" }`, which creates
  the `shortener.api` scope and the `musanna.shortener` resource. That resource is the
  `aud` this service expects.
- `appsettings.Development.json` → the `shortener-spa` public client
  (redirect `http://localhost:4400/auth/callback`) and `http://localhost:4400` in
  `Cors:Origins`, which the panel needs for the cookie login that precedes the OIDC
  redirect.

**4. This app**

```bash
jwc migrate up
jwc run          # http://localhost:8080
```

> Requires a `jwc` built with `--features redis`, and — until the fix ships — one that
> includes the interpreter redirect fix (`statusCode(302, {Location})` used to answer
> with the object as a *body* under `jwc run`; native builds were unaffected).

**5. The panel**

```bash
cd web
npm install
npm start        # http://localhost:4400
```

## The flow

1. Open <http://localhost:8080/> — landing page with live counters, a uz/en switch, and
   a box that resolves any short code without following it.
2. **Kirish** → the panel on :4400 → `/login`. Sign in with a musanna account, or
   register one (phone, password, name); in Development the SMS code comes back in the
   response and the form fills it in for you.
3. The panel posts the credentials to musanna (cookie), then runs authorization-code +
   PKCE. `angular-auth-oidc-client` owns the tokens and refreshes them before expiry.
4. **Havolalarim** — create a short link (optional expiry), copy it, show its QR, open
   it, watch the hit counter, and soft-delete it (a deleted link answers 410).
5. Signed in as `SuperAdmin`, the sidebar also shows **Administrator**: service-wide
   stats with a 14-day chart, every link with block/unblock, the user list, and the
   destination blocklist.

The seeded superadmin is `+998900000000` / `SuperAdmin1` and the login form is
pre-filled with it.

### The panel in one paragraph

`web/` starts from the in-house Angular template (Angular 19, PrimeNG, Tailwind,
ngx-translate) and takes its OIDC wiring from musanna-app: `provideAuth(...)` with
`withAppInitializerAuthCheck()`, `authInterceptor()` attaching the bearer token to the
API origin only, and a two-step logout that revokes the refresh token before ending the
platform session. Every string goes through ngx-translate — `npm run check-i18n` fails
if a key is missing from a locale or used in the source without existing at all.

### Tokens from the command line

```powershell
$t = .\scripts\get-token.ps1        # cookie login + PKCE against musanna
curl.exe -H "authorization: Bearer $t" http://localhost:8080/api/me/links
```

## Redis keys

| Key | Meaning | TTL |
|---|---|---|
| `link:{code}` | redirect cache: `{u,e}` / `__404__` / `__410__` | ≤300s / 60s |
| `hits:{bucket}` | hash of hit deltas per 10s bucket | 1h |
| `hits:cursor` | last flushed bucket (the flush claim marker) | — |
| `rl:user:{sub}` | create rate limit | 60s |
| `quota:d:{sub}:{day}` / `quota:m:{sub}:{month}` | quotas | 48h / 36d |

## Stack

- **JWC** for the service: `main.jwc` (schema, routes, auth) and `views.jwc` (landing).
- **Angular 19 + PrimeNG + Tailwind** for the panel in `web/`, with
  `angular-auth-oidc-client` for OIDC.
- **Postgres** for storage; `migrations/` applied with `jwc migrate up`.
- **Redis** via the `jwc-redis` package.
- **Docker** multi-stage native build (`jwc build --native`), Kubernetes via `deploy/`.
