# --- fetch the compiler ------------------------------------------------
#
# There is no build stage any more. `jwc build --native` was the 0.9.x AOT
# path; the 1.0 vocabulary has no native backend and `jwc serve` runs the
# program directly, so the image needs the compiler and the sources and no
# Rust toolchain at all.
FROM debian:trixie-slim AS fetch
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl ca-certificates && rm -rf /var/lib/apt/lists/*

# This service needs every one of these, and no earlier release has them:
#   content(mime, body)            the landing page, robots.txt, sitemap.xml
#                                  and og.svg are not JSON
#   break / continue               the retry-on-conflict loop in LinkService
#   whole-table aggregates         /api/v1/stats
#   timestamptz - interval         the 24-hour window in /api/v1/stats
#   long `+` chains                the landing page is 360 concatenated lines
# Do not pin below 0.9.9.
ARG JWC_VERSION=0.9.9
RUN curl -fsSL https://github.com/just-web-code/jwc-lang/releases/download/v${JWC_VERSION}/jwc-v${JWC_VERSION}-x86_64-linux.tar.gz \
        | tar -xz -C /usr/local/bin \
    && chmod +x /usr/local/bin/jwc \
    && jwc --version

# --- runtime -----------------------------------------------------------
FROM debian:trixie-slim
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates wget && rm -rf /var/lib/apt/lists/*
WORKDIR /app

# One binary serves both roles: the init container runs `jwc migrate up`
# and the pod runs `jwc serve`.
COPY --from=fetch /usr/local/bin/jwc /usr/local/bin/jwc
COPY jwcproj.json /app/jwcproj.json
COPY src /app/src
COPY migrations /app/migrations

EXPOSE 8080
ENV RUST_LOG=info
HEALTHCHECK --interval=30s --timeout=3s \
    CMD wget -q -O- http://127.0.0.1:8080/healthz || exit 1

# The port comes from `serve(int(env("PORT") ?? "8080"))` in `src/app.jwc`,
# which the runtime evaluates at boot (config.md §3.2.2).
CMD ["jwc", "serve", "/app"]
