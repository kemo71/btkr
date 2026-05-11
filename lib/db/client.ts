import "server-only";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@/db/schema";

/**
 * Singleton Postgres client + Drizzle handle.
 *
 * Connection string is read from `DATABASE_URL`. In production the database
 * must be hosted inside KSA (Architecture Principle AP2 — data sovereignty);
 * see `docs/togaf/03-technology-architecture.md`.
 *
 * Connection pooling is delegated to `postgres-js` (default pool of 10).
 * For serverless edge deploys, swap to `@neondatabase/serverless` later —
 * Drizzle API is portable.
 *
 * @example
 * import { db } from "@/lib/db/client";
 * const u = await db.select().from(schema.users).where(eq(schema.users.email, e));
 */
const connectionString = process.env.DATABASE_URL;

const globalForDb = globalThis as unknown as {
  pg?: ReturnType<typeof postgres>;
};

const pg =
  globalForDb.pg ??
  postgres(connectionString ?? "postgres://localhost/btkr_dev", {
    max: 10,
    prepare: false,
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.pg = pg;
}

export const db = drizzle(pg, { schema });
export { schema };
