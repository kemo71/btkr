import "server-only";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@/db/schema";
import { resolveDatabaseUrl, LOCAL_DEV_DATABASE_URL } from "./connection";

/**
 * Singleton Postgres client + Drizzle handle.
 *
 * The connection string is resolved from `DATABASE_URL` (or the
 * `POSTGRES_URL` / `POSTGRES_PRISMA_URL` / `*_UNPOOLED` names the Vercel /
 * Neon integration sets) — see `resolveDatabaseUrl()`. In production the
 * database must be hosted inside KSA (Architecture Principle AP2 — data
 * sovereignty); see `docs/togaf/03-technology-architecture.md`.
 *
 * `prepare: false` is required when the connection string points at a
 * transaction-mode pooler (PgBouncer / Supavisor) — which the Neon / Vercel
 * "pooled" endpoints are.
 *
 * For serverless edge deploys, swap to `@neondatabase/serverless` later —
 * the Drizzle API is portable.
 *
 * @example
 * import { db } from "@/lib/db/client";
 * const u = await db.select().from(schema.users).where(eq(schema.users.email, e));
 */
const connectionString = resolveDatabaseUrl();

if (!connectionString && process.env.NODE_ENV === "production") {
  // Don't throw at module load — the public pages import this transitively
  // even though they never query. But make the misconfiguration obvious in
  // the logs; the first actual query will fail with ECONNREFUSED otherwise.
  console.error(
    "[db] No database URL in the environment. Set DATABASE_URL (or POSTGRES_URL) " +
      "in the deployment and redeploy. Falling back to a non-connectable placeholder.",
  );
}

const globalForDb = globalThis as unknown as {
  pg?: ReturnType<typeof postgres>;
};

const pg =
  globalForDb.pg ??
  postgres(connectionString ?? LOCAL_DEV_DATABASE_URL, {
    max: 10,
    prepare: false,
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.pg = pg;
}

export const db = drizzle(pg, { schema });
export { schema };
