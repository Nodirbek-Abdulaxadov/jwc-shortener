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
# 1. Postgres (dev container)
docker run -d --name pg -p 5432:5432 \
    -e POSTGRES_USER=jwc -e POSTGRES_PASSWORD=jwc -e POSTGRES_DB=shortener postgres:17-alpine

# 2. Env
export JWC_DATABASE_URL=postgres://jwc:jwc@localhost:5432/shortener
export PUBLIC_BASE_URL=http://localhost:8080

# 3. Migrate + run
jwc migrate up
jwc run
# → server on :8080
```

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
