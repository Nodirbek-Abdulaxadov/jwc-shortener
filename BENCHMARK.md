# jwc-shortener A/B benchmark — request logging off the critical path

**Date:** 2026-08-11
**Baseline (`main`):** jwc-lang `730aaa8` (0.9.0) + jwc-shortener `5cd04b1`
**After (branch `claude/redis-package-qoshish-f1of1e`):** jwc-lang `dd80140` (0.9.0)
+ one codegen fix applied on top (see "The codegen bug") + jwc-shortener `d32bc4e`

## Headline

Moving the `api_call` INSERT out of the request phase and into the buffered
writer is worth **13x throughput and a 92% cut in mean latency** on a native
AOT build: 8,335 → 108,412 req/s, 5.99 ms → 457 µs. All three claims hold.

Two caveats that matter more than the headline:

- **The branch as committed does not log anything on a native build.** A
  pre-existing codegen bug made `after { }` blocks unreachable. The first
  native run of the branch served 3.5M requests and wrote **zero** rows. The
  numbers above are from a re-run with that bug fixed; the fix is in the
  jwc-lang working tree, not yet committed.
- **Half the rows are dropped.** At 108k req/s the writer landed 49.2% of them.
  That is the documented trade, but the default `JWC_LOG_BATCH` is the binding
  constraint, not the database.

## Environment

- Windows 11 Pro, 12 cores, `x86_64-pc-windows-msvc`, rustc 1.97.1.
- Postgres 17.10 in Docker (`jwc-bench-pg`, port 5434), dedicated to this run.
- `JWC_REDIS_URL` unset on both sides — the `redis` package falls back to its
  in-process cache, matching the baseline's `cache_get`/`cache_set` limiter.
- Compilers built from source with `cargo build --release`, invoked by path.
  `install-from-source` was not run.
- Load: `bombardier -c 50 -d 30s -l http://localhost:8080/`, preceded by a
  discarded 10 s warm-up, with `TRUNCATE api_call` between warm-up and
  measurement, and a 5 s settle before reading row counts. Identical invocation
  on both sides.
- Both repos checked out into detached `git worktree`s; the working checkouts
  were never switched.

Deviations from the brief, all forced:

1. **Ran on Windows, not Linux.** This machine's WSL has no outbound HTTPS, so
   neither cargo nor the JWC package registry is reachable there. `jwc build
   --native` has no platform gate and built cleanly on Windows. Absolute
   numbers are therefore not the Linux/Docker deployment numbers; the
   comparison between sides is still like-for-like.
2. **The baseline needed the nested `qr-lite/` directory moved aside** — see
   "Other things that looked wrong" #1. No app source was modified.
3. **App worktrees live at `C:\Users\nbkab\jb\{sm,sa}`.** Under the original
   deep path the generated cargo workspace overran `MAX_PATH` and `link.exe`
   failed with `LNK1104`.

## Native AOT — the comparison

Both sides rebuilt and re-run back to back, after the codegen fix.

| Metric | main (baseline) | branch (after) | Delta |
|---|---|---|---|
| Reqs/sec (avg) | 8,334.58 | 108,411.60 | **+13.01x** |
| Mean latency | 5.99 ms | 456.85 µs | −92.4% |
| p50 | 5.92 ms | 515 µs | −91.3% |
| p75 | 6.24 ms | 585 µs | −90.6% |
| p90 | 6.59 ms | 677 µs | −89.7% |
| p95 | 6.91 ms | 1.00 ms | −85.5% |
| p99 | 8.71 ms | 1.15 ms | −86.8% |
| Max | 18.63 ms | **25.09 ms** | **+34.7%** |
| Requests served (30 s) | 250,070 | 3,251,945 | +13.0x |
| Rows in `api_call` | 250,071 (100%) | 1,599,250 (49.2%) | — |
| Rows/sec written | ~8.3k | ~53.3k | +6.4x |
| HTTP non-2xx | 0 | 0 | — |

The baseline wrote one row per request — 250,071 = 250,070 load requests plus
the one `/metrics` probe, which the catch-all route answered 404 and logged.
The branch wrote 1,599,250 rows for 3,251,945 requests: **1,652,695 dropped**
(50.8%).

Only the worst case regresses, and mildly: 25.09 ms against 18.63 ms, which is
the batch flush contending with request handling. Every percentile through p99
improves by more than 85%.

## The codegen bug

**This is the finding that would have made the whole benchmark wrong.**

The first native run of the branch reported 117,791 req/s and 421 µs mean — even
better than the corrected numbers — and wrote **0 rows**. The `after { }` block
never ran. Codegen emitted the route body and the after-hook as siblings inside
`route_N_inner`:

```rust
let __resp = {
    return jwc_b_html(user_landing_html().await);   // returns from route_N_inner
    if let Some(__r) = jwc_take_return() { __r } else { V::Null }
};
jwc_set_response_status(jwc_status_of(&__resp));
let _ = mw_metricstracker_after().await;            // unreachable
```

A `return` in a JWC route body lowers to a real Rust `return`, so it exited
`route_N_inner` outright, jumping over the response-status capture and the
entire after-chain. Every route in this app ends in `return`, which is why the
row count was exactly zero rather than merely low.

It is **not a regression from this branch**: `mw_<name>_after()` emission
already exists in `main`'s `native_build.rs`. The branch is simply the first
code that depends on the after-phase running, and it inherited a broken one.
Nothing caught it — the emitted source still *contains* the `_after()` call,
just after a `return`, and `tests/native_emit.rs` (108 new lines on this branch)
had no `after` coverage.

The interpreter was always correct: under `jwc run` the same program logs
normally, which is how the bug was isolated to the native path.

**Fix applied** (in `src/native_build.rs`, `emit_route_handler`): when a route's
middleware chain has an `after` body, the route body is emitted into its own
`async fn route_N_body()` instead of inline, so its `return` exits the body and
`route_N_inner` proceeds to the after-chain. Routes with no after-chain keep the
flat inline shape and pay nothing. A regression test —
`emit_rust_source_keeps_the_after_block_reachable_past_a_return` — asserts no
`return` sits between binding `__resp` and the after-call. `cargo test --release
--test native_emit`: 15 passed.

This fix is **uncommitted** in the jwc-lang working tree.

## Supporting run — same A/B under the interpreter

Run while the native after-side was still broken, to prove the logging path
worked at all and to read the `jwc_log_*` counters, which native builds do not
expose. Retained because it is the only place those counters are visible.

| Metric | main | branch | Delta |
|---|---|---|---|
| Reqs/sec | 5,701.96 | 28,201.26 | +4.95x |
| Mean latency | 8.75 ms | 1.64 ms | −81.3% |
| p95 | 11.57 ms | 8.24 ms | −28.8% |
| p99 | 12.89 ms | **15.63 ms** | **+21.3%** |
| Max | 27.81 ms | **168.01 ms** | **+504%** |
| Requests served | 171,103 | 862,952 | +5.0x |
| Rows landed | 171,103 (100%) | 180,361 (20.9%) | — |
| `jwc_log_dropped_total` † | n/a | 885,363 | — |
| `jwc_log_failed_total` | n/a | 0 | — |

† Cumulative across warm-up and measured run; row counts are post-truncate.

The interpreter's tail regression is far worse than native's. Under native the
same trade costs only the max.

## Row counts and drops

`jwc_log_failed_total` stayed 0 throughout: nothing failed to persist, rows were
dropped at the channel because the writer could not drain fast enough.

Which knob? A labelled fourth run, after the clean comparison was complete —
same branch, interpreter, `JWC_LOG_BATCH=5000`, `JWC_LOG_QUEUE=100000`, flush
unchanged at 200 ms:

| | default (500 / 10,000) | tuned (5,000 / 100,000) |
|---|---|---|
| Reqs/sec | 28,201 | 27,313 (unchanged, within noise) |
| Requests served | 862,952 | 832,204 |
| Rows landed | 180,361 (20.9%) | **607,582 (73.0%)** |
| Rows/sec written | ~6.0k | **~20.3k** |
| Dropped (cumulative) | 885,363 | 269,466 |
| Batch INSERTs issued | 583 | 232 |

**`JWC_LOG_BATCH`, not the database.** Tripling write throughput by batching
5,000 rows per statement instead of 500 — with request throughput unmoved — says
the limit was per-INSERT round-trip overhead. A larger `JWC_LOG_QUEUE` alone
would only deepen the backlog: under sustained overload the queue drains at
whatever the flush achieves, and 10,000 slots at 6k rows/s is 1.6 seconds of
headroom.

The native side is far less starved (53.3k rows/s at the default batch of 500,
versus 6.0k under the interpreter) but still drops half its rows at 108k req/s.
The defaults are sized for a service doing thousands of req/s, not a hundred
thousand. For 1kb.uz's real traffic they are almost certainly fine; this is a
saturation test, not a workload.

## Build time and binary size

| | main | branch | Delta |
|---|---|---|---|
| `jwc build --native --release` wall-clock | 88.1 s | 103.3 s | +15.2 s (+17.3%) |
| Binary size | 3,173,376 B (3.03 MB) | 5,245,440 B (5.00 MB) | **+2,072,064 B (+65.3%)** |
| `reqwest` in `.jwc-build/Cargo.toml` | present | **absent** | — |
| Compiler build (`cargo build --release`) | 3m 49s | 3m 48s | — |

Dropping `reqwest` did not shrink anything. The `redis` package pulls in `redis`
0.27.6 and `deadpool-redis` 0.18.0, and those outweigh what `reqwest` removed —
both the binary and the build got bigger.

## The three claims

**1. Request latency drops. — HOLDS.** 5.99 ms → 457 µs mean, 8,335 → 108,412
req/s on native, with every percentile through p99 down more than 85%. The
mechanism is exactly as claimed: the baseline ran a synchronous INSERT in a
request-phase middleware, before the route handler. Qualifier: the maximum
latency rises 35% (18.63 → 25.09 ms), so the trade is better averages for a
slightly worse worst case. Second qualifier: this only holds **after** the
codegen fix; the branch as committed logs nothing on native, and its apparent
14x was measuring an empty writer.

**2. `latency_ms` is no longer always 0 and `status` no longer always 200. —
HOLDS mechanically, but is close to invisible on this workload.**
- `status` is real: the native after-run recorded `404` for the one `/metrics`
  probe alongside 1,599,249 rows of `200`. A targeted interpreter check
  (5 × `GET /` plus `GET /nosuchcode`) recorded `status=404, latency_ms=4` for
  the miss. The baseline recorded `200` for its own 404.
- `latency_ms` is real but floors to zero: min 0, max 1, avg 0.00 across 1.6M
  rows. `GET /` is a sub-millisecond static response and the column is integer
  milliseconds. The value is no longer *hardcoded* 0 — it is measured, and
  measures 0. If the goal is usable percentiles in `/stats`, the column needs
  sub-millisecond resolution.

**3. A native build no longer compiles `reqwest`. — HOLDS.** Absent from the
branch's generated `Cargo.toml`, present in the baseline's (`reqwest = {
version = "0.12", default-features = false, features = ["rustls-tls", "json"]
}`), and absent from the branch's cargo build log. It did not translate into a
smaller binary or a faster build, because the `redis` package more than takes
its place.

## Other things that looked wrong

**1. The baseline does not build with its own compiler.** `jwc 0.9.0` +
jwc-shortener `main` fails with:

```
error[E021]: Function 'qr_svg_url': function 'qr_encode' is private to
namespace '<root>' and cannot be called from 'qr-lite'
```

`collect_jwc_files` descends into the vendored `qr-lite/` sub-project and loads
it a second time into `<root>`. The branch fixes this (`dd80140`). To get a
baseline binary at all, `qr-lite/` was moved outside the project root for the
baseline build only; the branch side kept it in place and correctly ignored it.
An unlisted win for the branch: **it is the commit that makes the baseline
buildable.**

**2. Native builds serve no `/metrics` endpoint.** `jwc_log_stats()` is emitted
into the generated source but nothing calls it, and `native_build.rs` emits no
metrics route. `curl localhost:8080/metrics` against a native binary falls
through to the catch-all redirect and returns `{"error":"no such link"}` —
which then gets logged as a row. Every counter in this report therefore comes
from the interpreter, and native drop counts are inferred from
`requests − rows`.

**3. `MAX_PATH` / `LNK1104`.** The generated workspace nests to
`.jwc-build/target/release/build/<crate>-<hash>/build_script_build-<hash>.exe`.
Under a long project path that exceeds 260 characters and the link step fails
with a message that never mentions path length. Worth a preflight check in
`native_build.rs` on Windows.

## What could not be measured

- **Linux / musl / Docker numbers.** WSL on this machine has no outbound
  network; everything here is `x86_64-pc-windows-msvc`. Ratios should carry,
  absolute values will not.
- **`jwc_log_*` counters on a native build** — blocked by #2 above.
- **Rate-limiter behaviour under real Redis.** `JWC_REDIS_URL` was left unset
  per the brief, so only the in-process fallback was exercised.
- **`POST /api/links`** — rate-limited by design, excluded per the brief. The
  write path's latency under the new writer is therefore unmeasured.

## Artifacts

Raw bombardier output, build logs, generated `Cargo.toml`, and SQL results:
`C:\Users\nbkab\AppData\Local\Temp\claude\c--Users-nbkab-OneDrive-Ishchi-stol-jwc-shortener\9f6b6752-6358-408e-aaa0-d34bd8ab6cfb\scratchpad\bench\`
(`results-main/`, `results-after/`, `results-interp-main/`, `results-interp-after/`,
`results-interp-after-tuned.txt`, `run_side.sh`, `run_interp.sh`).
