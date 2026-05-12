/**
 * Resolve the Postgres connection string from the environment.
 *
 * Accepts the names used by the common managed providers / Vercel
 * integrations, in priority order:
 *   - `DATABASE_URL`                — our canonical name (and Neon/Vercel set it)
 *   - `POSTGRES_URL`                — "Vercel Postgres" / Neon integration (pooled)
 *   - `POSTGRES_PRISMA_URL`         — same integration, pooled (`?pgbouncer=true`)
 *   - `DATABASE_URL_UNPOOLED`       — Neon integration (direct, non-pooled)
 *   - `POSTGRES_URL_NON_POOLING`    — "Vercel Postgres" (direct, non-pooled)
 *
 * In dev, falls back to a local Postgres so `pnpm dev` works against
 * `infra/docker-compose.yml`. In production, returns `undefined` if none is
 * set — the caller decides what to do (the runtime client below leaves a
 * deliberately-unconnectable placeholder + warns; `scripts/migrate.ts`
 * exits with an error).
 *
 * @see lib/db/client.ts, scripts/migrate.ts, drizzle.config.ts
 */
export function resolveDatabaseUrl(): string | undefined {
  return (
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    process.env.DATABASE_URL_UNPOOLED ||
    process.env.POSTGRES_URL_NON_POOLING ||
    undefined
  );
}

/**
 * Prefer a *non-pooled* (direct) connection — used for migrations, since
 * DDL over a transaction-mode pooler (PgBouncer) can be unreliable. Falls
 * back to whatever `resolveDatabaseUrl()` returns.
 */
export function resolveDirectDatabaseUrl(): string | undefined {
  return (
    process.env.DATABASE_URL_UNPOOLED ||
    process.env.POSTGRES_URL_NON_POOLING ||
    resolveDatabaseUrl()
  );
}

export const LOCAL_DEV_DATABASE_URL = "postgres://localhost/btkr_dev";
