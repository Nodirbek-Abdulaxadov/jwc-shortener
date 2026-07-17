# --- builder: compile JWC source → native binary ----------------------
# v0.3.7+ added native AOT support for every builtin the merged
# shortener uses. We stay on the small, statically-linked `--native`
# path — the INSERT codegen ToSql bug has been fixed upstream.
#
# `rust:1.90-slim` ships Debian Trixie (glibc 2.40), matching the build
# host of the published jwc binary. Older bases (rust:1.83-slim →
# Bookworm, glibc 2.36) hit `GLIBC_2.39 not found (required by jwc)`.
FROM rust:1.90-slim AS builder
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    curl ca-certificates pkg-config libssl-dev && rm -rf /var/lib/apt/lists/*

ARG JWC_VERSION=0.6.3
RUN curl -fsSL https://github.com/Nodirbek-Abdulaxadov/jwc-lang/releases/download/v${JWC_VERSION}/jwc-v${JWC_VERSION}-x86_64-linux.tar.gz \
        | tar -xz -C /usr/local/bin \
    && chmod +x /usr/local/bin/jwc \
    && jwc --version

COPY . .
# Force a portable baseline CPU target. `jwc build --native` generates Rust and
# compiles it with the embedded cargo/rustc toolchain, which honours RUSTFLAGS.
# Without pinning target-cpu, newer CI runners bake in host-only SIMD (AVX-512)
# and the binary dies with SIGILL / "trap invalid opcode" on older or
# feature-masked CPUs — e.g. the QEMU "AMD EPYC" model on the production node.
# x86-64-v2 (SSE4.2, no AVX) runs on effectively every x86-64 host.
RUN RUSTFLAGS="-C target-cpu=x86-64-v2" jwc build --native --release

# --- runtime ----------------------------------------------------------
FROM debian:trixie-slim
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates wget && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=builder /app/bin/release/jwc-shortener /usr/local/bin/jwc-shortener
# `jwc` CLI is bundled too — the init container at deploy time runs
# `jwc migrate up`, which only exists on the compiler/CLI binary. The
# AOT-built `jwc-shortener` app only knows how to `serve()`; if you
# pass it `migrate up` arguments it silently ignores them and starts
# the HTTP server, which keeps the init container hung forever.
COPY --from=builder /usr/local/bin/jwc /usr/local/bin/jwc
COPY --from=builder /app/migrations /app/migrations
COPY --from=builder /app/jwc-shortener.jwcproj /app/jwc-shortener.jwcproj
COPY --from=builder /app/main.jwc /app/main.jwc
COPY --from=builder /app/views.jwc /app/views.jwc
EXPOSE 8080
ENV RUST_LOG=info
HEALTHCHECK --interval=30s --timeout=3s \
    CMD wget -q -O- http://127.0.0.1:8080/healthz || exit 1
CMD ["jwc-shortener"]
