import "dotenv/config";
import type { Config } from "drizzle-kit";

/**
 * Drizzle Kit configuration.
 *
 * Generates SQL migrations from the TypeScript schema in `db/schema/`.
 *
 * The connection string is read from `DATABASE_URL` (or the `POSTGRES_URL` /
 * `*_UNPOOLED` names the Vercel/Neon integration sets). Mirrors
 * `resolveDirectDatabaseUrl()` in `lib/db/connection.ts` — kept inline here
 * so the config has no `@/`-alias dependency under drizzle-kit's loader.
 *
 * Common commands:
 *   pnpm db:generate            # generate a new migration from schema diff
 *   pnpm db:studio              # local schema browser
 *
 * @see https://orm.drizzle.team/docs/drizzle-config-file
 * @see lib/db/connection.ts
 */
const url =
  process.env.DATABASE_URL_UNPOOLED ||
  process.env.POSTGRES_URL_NON_POOLING ||
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  process.env.POSTGRES_PRISMA_URL ||
  "postgres://localhost/btkr_dev";

export default {
  schema: "./db/schema/index.ts",
  out: "./db/migrations",
  dialect: "postgresql",
  dbCredentials: { url },
  strict: true,
  verbose: true,
} satisfies Config;
