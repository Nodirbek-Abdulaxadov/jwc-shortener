# jwc-shortener

URL shortener written in [JWC](https://github.com/Nodirbek-Abdulaxadov/jwc-lang) — v2, a
clean-slate rewrite around a read-heavy (≈100:1) design: one server, Postgres + Redis,
native binary.

## Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/links` | Bearer | `{url, expires_at?}` → `201 {code, short, qr}` |
| `GET` | `/{code}` | — | 302 redirect (404 unknown/blocked, 410 deleted/expired) |
| `GET` | `/api/links/{code}` | — | `{code, url, hits, created_at}` |
| `GET` | `/api/me/links` | Bearer | own links, newest first |
| `DELETE` | `/api/me/links/{code}` | Bearer | soft delete |
| `GET` | `/healthz` `/readyz` `/metrics` | — | runtime built-ins |

Auth is OIDC: access tokens issued by the IdP (musanna-platform / OpenIddict),
verified against its JWKS (`jwt_verify_jwks`, RS256).

## How it works

- **Codes** — `base62((nextval * ODD mod 2^32) xor XOR)`, computed by the
  `next_code()` SQL function inside the INSERT. Bijective: no collisions, no
  retry loop, sequence not observable. Constants live in the init migration
  and must never change. Capacity 2^32-1, always 6 chars.
- **Redirect** — one Redis round-trip: a Lua script reads the cache entry,
  bumps `hits:{floor(now/10)}`, and claims the closed-bucket flush range.
  Misses load from Postgres and cache for ≤300s; unknown codes are
  negative-cached 60s (code-enumeration scans must not reach Postgres).
- **Hit flush** — no background scheduler exists in a native JWC binary, so
  the redirect that first observes a bucket rollover drains the closed
  buckets into `link.hits` + `link_stat_daily` (one request per ~10s pays a
  few extra round-trips). Worst case on crash: ~10s of hits, same class as
  Redis AOF `everysec`.
- **Redirects are not logged per-request** — the counter is the analytics
  source.
- **Degradation** — no/broken Redis: in-process cache + per-request Postgres
  hits bump. Postgres down: cached redirects keep working.

## Local dev (no Docker)

Needs: local Postgres, `jwc` 0.9.4+, optionally Redis, and the IdP
(musanna-platform) running locally for authed endpoints.

```bash
# Env
export JWC_DATABASE_URL=postgres://jwc:jwc@localhost:5432/shortener
export PUBLIC_BASE_URL=http://localhost:8080
export JWKS_URL=https://localhost:7443/.well-known/jwks   # musanna dev host
# optional:
# export JWC_REDIS_URL=redis://localhost:6379
# export JWC_JWT_EXPECTED_ISS=https://localhost:7443/
# export JWC_JWT_EXPECTED_AUD=jwc-shortener
# export DAILY_QUOTA=100 MONTHLY_QUOTA=1000 CREATE_RATE_LIMIT=10

jwc migrate up
jwc run
```

> The init migration drops the v1 tables (`link`, `api_call`) — v2 is a fresh
> start. On a database that ran v1 migrations, easiest is a fresh database.

Without `JWC_REDIS_URL` everything still runs: caching falls back in-process
and hit counting goes straight to Postgres. That is the dev path, not the
production one — `redis.available()` and the `jwc_redis_pool_*` metrics tell
you which you're on.

## Try it

```bash
TOKEN=... # access token from the IdP

curl -X POST http://localhost:8080/api/links \
    -H "authorization: Bearer $TOKEN" -H 'content-type: application/json' \
    -d '{"url":"https://example.com/very/long/path"}'
# → {"code":"4fRw2Z","short":"localhost:8080/4fRw2Z","qr":"<img .../>"}

curl -I http://localhost:8080/4fRw2Z
# → HTTP/1.1 302 Found
# → Location: https://example.com/very/long/path
```

## Redis keys

| Key | Meaning | TTL |
|---|---|---|
| `link:{code}` | redirect cache: `{u,e}` / `__404__` / `__410__` | ≤300s / 60s |
| `hits:{bucket}` | hash of hit deltas per 10s bucket | 1h |
| `hits:cursor` | last flushed bucket (flush claim marker) | — |
| `rl:user:{sub}` | create rate limit | 60s |
| `quota:d:{sub}:{day}` / `quota:m:{sub}:{month}` | quotas | 48h / 36d |

## Stack

- **JWC** for the whole app (`main.jwc`), `redis` + `qr-lite` packages.
- **Postgres** for storage; `migrations/` applied with `jwc migrate up`.
- **Docker** multi-stage native build (`jwc build --native`), Kubernetes via `deploy/`.
