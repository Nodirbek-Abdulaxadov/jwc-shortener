# jwc-shortener

URL shortener written in [JWC](https://github.com/Nodirbek-Abdulaxadov/jwc-lang) — a
clean-slate v2 built around a read-heavy (≈100:1) design: one server, Postgres + Redis,
native binary. Landing page, admin panel and API all come from the same process on
one port; authentication is OIDC against **musanna-platform**.

## Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/` | — | landing page |
| `GET` | `/admin` | — | admin panel (also the OIDC redirect target) |
| `GET` | `/{code}` | — | 302 redirect (404 unknown/blocked, 410 deleted/expired) |
| `GET` | `/api/stats` | — | `{links, clicks, today}` for the landing counters |
| `GET` | `/api/links/{code}` | — | `{code, url, hits, created_at}` |
| `POST` | `/api/links` | Bearer | `{url, expires_at?}` → `201 {code, short, qr}` |
| `GET` | `/api/me/links` | Bearer | own links, newest first |
| `DELETE` | `/api/me/links/{code}` | Bearer | soft delete |
| `GET` | `/healthz` `/readyz` `/metrics` | — | runtime built-ins |

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
- `appsettings.Development.json` → the `shortener-admin` public client
  (redirect `http://localhost:8080/admin`) and `http://localhost:8080` in `Cors:Origins`,
  which the admin panel needs for the cookie login.

**4. This app**

```bash
jwc migrate up
jwc run          # http://localhost:8080
```

> Requires a `jwc` built with `--features redis`, and — until the fix ships — one that
> includes the interpreter redirect fix (`statusCode(302, {Location})` used to answer
> with the object as a *body* under `jwc run`; native builds were unaffected).

## The flow

1. Open <http://localhost:8080/> — landing page, live counters, and a box that resolves
   any short code without following it.
2. **Kirish** → `/admin`. Log in with a musanna account, or register one (phone,
   password, name); in Development the SMS code comes back in the response and the form
   fills it in for you.
3. The panel logs in against musanna, then runs authorization-code + PKCE and exchanges
   the code for an access token. It keeps the token in `sessionStorage` only.
4. Create a short link (optional expiry), copy it, open it, watch the hit counter, and
   soft-delete it — a deleted link answers 410.

The seeded superadmin is `+998900000000` / `SuperAdmin1` and the login form is
pre-filled with it.

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

- **JWC** for the whole app: `main.jwc` (schema, routes, auth) and `views.jwc`
  (landing + admin HTML). The admin panel is dependency-free — no npm, no bundler,
  no second dev server.
- **Postgres** for storage; `migrations/` applied with `jwc migrate up`.
- **Redis** via the `jwc-redis` package.
- **Docker** multi-stage native build (`jwc build --native`), Kubernetes via `deploy/`.
