# --- builder: download + verify the jwc CLI ---------------------------
# We ship the interpreter, not a native binary. The `--native` AOT
# codegen doesn't yet support `cache_get` / `cache_set` / `uuid` / `now`
# / `raw_sql` (ROADMAP.md Phase 4). When those land, switch back to
# `jwc build --native --release` for a ~15 MB smaller, statically-linked
# image.
#
# Debian Trixie matches the glibc (2.40) the published jwc binary was
# built against — Bookworm (glibc 2.36) hits `GLIBC_2.39 not found`.
FROM debian:trixie-slim AS builder
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl ca-certificates && rm -rf /var/lib/apt/lists/*

ARG JWC_VERSION=0.3.5
RUN curl -fsSL https://github.com/Nodirbek-Abdulaxadov/jwc-lang/releases/download/v${JWC_VERSION}/jwc-v${JWC_VERSION}-x86_64-linux.tar.gz \
        | tar -xz -C /usr/local/bin \
    && chmod +x /usr/local/bin/jwc \
    && jwc --version

COPY . .
# Validate at build time so a syntax error fails CI, not k8s rollout.
RUN jwc check main.jwc

# --- runtime ----------------------------------------------------------
FROM debian:trixie-slim
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates wget && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=builder /usr/local/bin/jwc /usr/local/bin/jwc
COPY --from=builder /app /app
EXPOSE 8080
ENV RUST_LOG=info
HEALTHCHECK --interval=30s --timeout=3s \
    CMD wget -q -O- http://127.0.0.1:8080/healthz || exit 1
# `jwc run` walks upward from cwd to find jwcproj.json, then boots
# the interpreter against main.jwc. `jwc-shortener migrate up` from
# the init container is forwarded to `jwc migrate up` by the same
# project loader.
ENTRYPOINT ["jwc"]
CMD ["run"]
