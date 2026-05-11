import type { Config } from "drizzle-kit";

/**
 * Drizzle Kit configuration.
 *
 * Generates SQL migrations from the TypeScript schema in `db/schema/`.
 *
 * Common commands:
 *   pnpm drizzle-kit generate   # generate a new migration from schema diff
 *   pnpm drizzle-kit migrate    # apply pending migrations
 *   pnpm drizzle-kit studio     # local schema browser
 *
 * @see https://orm.drizzle.team/docs/drizzle-config-file
 */
export default {
  schema: "./db/schema/index.ts",
  out: "./db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "postgres://localhost/btkr_dev",
  },
  strict: true,
  verbose: true,
} satisfies Config;
