-- jwc-shortener v2 — clean-slate schema (the rewrite abandons v1 data).
DROP TABLE IF EXISTS "api_call";
DROP TABLE IF EXISTS "link";

CREATE TABLE "link" (
    "code"       varchar(8) NOT NULL,
    "url"        varchar(2048) NOT NULL,
    "dest_host"  varchar(255) NOT NULL,
    "owner_sub"  varchar(255) NOT NULL,
    "status"     varchar(16) NOT NULL DEFAULT 'active',   -- active | blocked
    "hits"       bigint NOT NULL DEFAULT 0,               -- flushed from Redis buckets
    "created_at" timestamptz NOT NULL DEFAULT now(),
    "expires_at" timestamptz,
    "deleted_at" timestamptz,
    PRIMARY KEY ("code")
);
CREATE INDEX "link_owner_created_idx" ON "link" ("owner_sub", "created_at" DESC);
CREATE INDEX "link_dest_host_idx"     ON "link" ("dest_host");

CREATE TABLE "app_user" (
    "sub"        varchar(255) NOT NULL,
    "email"      varchar(320),
    "status"     varchar(16) NOT NULL DEFAULT 'active',
    "created_at" timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY ("sub")
);

-- Analytics source: per-link per-day counters, upserted by the flusher.
CREATE TABLE "link_stat_daily" (
    "code" varchar(8) NOT NULL,
    "day"  date NOT NULL,
    "hits" bigint NOT NULL,
    PRIMARY KEY ("code", "day")
);

CREATE TABLE "blocked_host" (
    "host" varchar(255) NOT NULL,
    PRIMARY KEY ("host")
);

-- Code generation: code = base62((n * ODD_CONST mod 2^32) xor XOR_CONST).
-- An odd multiplier is a bijection mod 2^32, so codes are collision-free by
-- construction (no retry loop) and the sequence is invisible from outside.
-- Capacity: 2^32-1 codes; base62 of a 32-bit value always fits 6 chars
-- (62^6 > 2^32), zero-padded by the fixed 6-round loop.
--
-- ODD_CONST = 2654435761, XOR_CONST = 2166136261. These are baked into every
-- issued code and MUST NEVER change — a different pair would re-map future
-- codes onto the already-issued space and collide.
CREATE SEQUENCE "link_code_seq" MINVALUE 1 MAXVALUE 4294967295 NO CYCLE;

CREATE OR REPLACE FUNCTION next_code() RETURNS text AS $$
DECLARE
    -- numeric for the product: n * ODD_CONST overflows bigint for n > ~3.5e9.
    m        bigint;
    alphabet text := '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
    res      text := '';
    i        int;
BEGIN
    m := mod(nextval('link_code_seq')::numeric * 2654435761, 4294967296)::bigint # 2166136261;
    FOR i IN 1..6 LOOP
        res := substr(alphabet, (m % 62)::int + 1, 1) || res;
        m := m / 62;
    END LOOP;
    RETURN res;
END;
$$ LANGUAGE plpgsql;
