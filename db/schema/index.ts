/**
 * Database schema barrel.
 *
 * One aggregate per file. Import this barrel from `lib/db/client.ts` to
 * register schemas with Drizzle:
 *
 * @example
 * import * as schema from "@/db/schema";
 * const db = drizzle(client, { schema });
 *
 * @see docs/STRUCTURE.md (conventions)
 */
export * from "./users";
export * from "./rbac";
export * from "./ideas";
export * from "./lifecycle";
export * from "./accreditations";
export * from "./audit";
export * from "./byok";
