import "server-only";
import { eq } from "drizzle-orm";
import { cache } from "react";
import { db, schema } from "@/lib/db/client";
import { resolveActor, type Actor } from "@/lib/rbac";

/**
 * Resolve the *current* request's actor (authenticated user + permissions).
 *
 * Phase 1 (this file): dev-mode shim that reads `BTKR_DEV_USER` (an email)
 * from the environment and resolves that user from the DB. This lets us
 * build and exercise protected routes before federated SSO lands.
 *
 * Phase 1.5 (planned): replaces this with a real session lookup — read the
 * session cookie, look up `sessions` row, verify expiry + revocation, then
 * call `resolveActor()` for the authenticated `users.id`.
 *
 * The function is cached per-request via React's `cache` so multiple
 * protected boundaries in the same render share one DB round-trip.
 *
 * @example
 * const actor = await getCurrentActor();
 * assertPermission(actor, "byok-key:read");
 *
 * @throws {NotAuthenticated} when no actor can be resolved.
 */
export const getCurrentActor = cache(async (): Promise<Actor> => {
  const email = process.env.BTKR_DEV_USER;

  if (process.env.NODE_ENV === "production" && email) {
    throw new Error(
      "BTKR_DEV_USER must not be set in production. Use the SSO session instead.",
    );
  }

  if (!email) {
    throw new NotAuthenticated(
      "No current actor. In dev set BTKR_DEV_USER=admin@ksaa.gov.sa in .env.local.",
    );
  }

  const [user] = await db
    .select({ id: schema.users.id, isActive: schema.users.isActive })
    .from(schema.users)
    .where(eq(schema.users.email, email));

  if (!user) {
    throw new NotAuthenticated(
      `Dev user ${email} not found. Run pnpm db:seed.`,
    );
  }
  if (!user.isActive) {
    throw new NotAuthenticated(`Dev user ${email} is deactivated.`);
  }

  return resolveActor(user.id);
});

/**
 * Optional variant — returns null instead of throwing. Use for routes that
 * should render an unauthenticated state rather than a 5xx.
 *
 * @example
 * const actor = await tryGetCurrentActor();
 * if (!actor) redirect("/login");
 */
export async function tryGetCurrentActor(): Promise<Actor | null> {
  try {
    return await getCurrentActor();
  } catch (err) {
    if (err instanceof NotAuthenticated) return null;
    throw err;
  }
}

export class NotAuthenticated extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NotAuthenticated";
  }
}
