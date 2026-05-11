/**
 * Apply pending Drizzle migrations.
 *
 * Usage:
 *   pnpm db:migrate
 *
 * Reads `DATABASE_URL` from the environment (`.env.local` is loaded
 * automatically). Idempotent — applied migrations are tracked in the
 * `__drizzle_migrations` table.
 *
 * @see drizzle.config.ts
 * @see db/migrations/
 */
import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

const client = postgres(url, { max: 1 });
const db = drizzle(client);

await migrate(db, { migrationsFolder: "./db/migrations" });
await client.end();
console.log("migrations applied");
