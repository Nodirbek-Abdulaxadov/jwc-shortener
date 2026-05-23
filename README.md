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

## Production deploy

This app is deployed via the [`musanna-soft/k8s-gitops`](https://github.com/musanna-soft/k8s-gitops) repo at `apps/jwc-shortener/`. Pipeline:

```
push to main (this repo)
  → GitHub Actions builds the docker image with `jwc build --native`
  → image pushed to ghcr.io/nodirbek-abdulaxadov/jwc-shortener
  → CI writes the new tag into k8s-gitops/apps/jwc-shortener/deployment.yaml
  → ArgoCD picks up the commit, rolls the pod
```

Time from `git push` to a new pod serving traffic: **~5–7 minutes** (most of that is the `jwc build --native` step).

## Stack

- **JWC** for the entire application (1 file, ~90 LoC).
- **Postgres** for storage (shared cluster postgres).
- **Docker** multi-stage: rust+jwc builder, debian-slim runtime (~80 MB image).
- **Kubernetes** + ArgoCD via the GitOps repo.
- **Cloudflare** edge + Let's Encrypt cert via cluster cert-manager.
