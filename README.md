# jwc-shortener

A real production app written in [JWC](https://github.com/Nodirbek-Abdulaxadov/jwc-lang) — minimal URL shortener.

Live: <https://1kb.uz/>

## Endpoints

| Method | Path | Description |
|---|---|---|
| `GET`  | `/healthz` | `{"status":"ok"}` — Kubernetes liveness/readiness probe |
| `POST` | `/api/links` | `{"url":"..."}` → `{code, short}` |
| `GET`  | `/:code` | 302 redirect to the original URL (increments `hits`) |
| `GET`  | `/api/links/:code` | `{code, url, hits, created_at}` |

## Local dev

```bash
# 1. Postgres + Redis
docker compose up -d

# 2. Env
export JWC_DATABASE_URL=postgres://jwc:jwc@localhost:5432/shortener
export JWC_REDIS_URL=redis://localhost:6379
export PUBLIC_BASE_URL=http://localhost:8080

# 3. Migrate + run
jwc migrate up
jwc run
# → server on :8080
```

Requires **jwc 0.9.2+** — `MetricsTracker` calls `log_insert`, which earlier
compilers do not know.

### Why `JWC_REDIS_URL` matters

Leave it unset and everything still runs: the `redis` package falls back to
an in-process cache. That fallback is deliberate — a laptop should not need
Redis — but it is **not** the production code path, and the difference is
invisible until it bites:

| | with `JWC_REDIS_URL` | without |
|---|---|---|
| `RateLimit` window | shared across replicas | per process — effective limit is `60 × replicas` |
| `INCR` + `EXPIRE` | one atomic Lua script | two calls, so two concurrent requests can both read the same count |

`/metrics` tells you which one you are on: `jwc_redis_pool_*` series appear
only when Redis is actually configured.

Set it in the cluster the same way `JWC_DATABASE_URL` is set — the app reads
it at boot and fails fast on a malformed URL rather than letting every
request rediscover the typo.

## Try it

```bash
curl -X POST http://localhost:8080/api/links \
    -H 'content-type: application/json' \
    -d '{"url":"https://example.com/very/long/path?with=many&query=params"}'
# → {"code":"a3f9c2d","short":"http://localhost:8080/a3f9c2d"}

curl -I http://localhost:8080/a3f9c2d
# → HTTP/1.1 302 Found
# → Location: https://example.com/very/long/path?with=many&query=params
```

## Stack

- **JWC** for the entire application (1 file, ~90 LoC).
- **Postgres** for storage (shared cluster postgres).
- **Docker** multi-stage: rust+jwc builder, debian-slim runtime (~80 MB image).
- **Kubernetes** + ArgoCD via the GitOps repo.
- **Cloudflare** edge + Let's Encrypt cert via cluster cert-manager.

## Local package prototype: `qr-lite`

This repo now includes a local JWC package prototype at `qr-lite/` so you can
try QR-style SVG generation before moving it into a separate repository.

- Manifest: `qr-lite/qr-lite.jwcproj` (`type: "pkg"`, `pkgVersion: "0.1.0"`).
- Exported function: `qr_svg(text: string): string`.
- Output: deterministic QR-like SVG for local UI/API flow testing.
- App integration (no publish): `jwc-shortener.jwcproj` depends on `./qr-lite`
  via local `path` source, and `POST /api/links` now returns `qr_svg`.
