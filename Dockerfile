# --- builder: compile JWC source → native binary -----------------------
# `rust:1.90-slim` ships Debian Trixie (glibc 2.40), matching the build
# host of the pinned jwc release binary. Older bases (rust:1.83-slim →
# Bookworm, glibc 2.36) hit `GLIBC_2.39 not found (required by jwc)`.
FROM rust:1.90-slim AS builder
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    curl ca-certificates pkg-config libssl-dev && rm -rf /var/lib/apt/lists/*

# Install the jwc CLI. Pin the version so a fresh release doesn't silently
# rebuild every image — bump deliberately when adopting new features.
ARG JWC_VERSION=0.3.5
RUN curl -fsSL https://github.com/Nodirbek-Abdulaxadov/jwc-lang/releases/download/v${JWC_VERSION}/jwc-v${JWC_VERSION}-x86_64-linux.tar.gz \
        | tar -xz -C /usr/local/bin \
    && chmod +x /usr/local/bin/jwc

COPY . .
RUN jwc build --native --release

# --- runtime ----------------------------------------------------------
FROM debian:bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates wget && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=builder /app/bin/release/jwc-shortener /usr/local/bin/jwc-shortener
# Migrations are copied so the deployment can run `migrate up` once on boot.
COPY --from=builder /app/migrations /app/migrations
COPY --from=builder /app/jwc-shortener.jwcproj /app/jwc-shortener.jwcproj
EXPOSE 8080
ENV RUST_LOG=info
HEALTHCHECK --interval=30s --timeout=3s \
    CMD wget -q -O- http://127.0.0.1:8080/healthz || exit 1
CMD ["jwc-shortener"]
