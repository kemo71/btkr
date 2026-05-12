/**
 * Apply pending Drizzle migrations.
 *
 * Usage:
 *   pnpm db:migrate          # runs with --conditions=react-server
 *
 * Reads the connection string from `DATABASE_URL` (or the `POSTGRES_URL` /
 * `*_UNPOOLED` names the Vercel/Neon integration sets) — `.env.local` is
 * loaded automatically. Prefers a *direct* (non-pooled) URL for DDL.
 * Idempotent — applied migrations are tracked in `__drizzle_migrations`.
 *
 * @see lib/db/connection.ts
 * @see drizzle.config.ts
 * @see db/migrations/
 */
import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { resolveDirectDatabaseUrl } from "@/lib/db/connection";

// Wrapped in a function (not top-level await): tsx compiles this as CJS
// when package.json has no "type": "module", and CJS forbids top-level await.
async function main(): Promise<void> {
  const url = resolveDirectDatabaseUrl();
  if (!url) {
    console.error(
      "No database URL. Set DATABASE_URL (or POSTGRES_URL) — e.g. `vercel env pull .env.local`.",
    );
    process.exit(1);
  }

  const client = postgres(url, { max: 1, prepare: false });
  const db = drizzle(client);

  await migrate(db, { migrationsFolder: "./db/migrations" });
  await client.end();
  console.log("migrations applied");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
