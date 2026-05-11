import "server-only";
import { eq } from "drizzle-orm";
import { cache } from "react";
import { cookies } from "next/headers";
import { db, schema } from "@/lib/db/client";
import { resolveActor, type Actor } from "@/lib/rbac";

/** Dev-only cookie that overrides BTKR_DEV_USER per browser session. */
export const DEV_USER_COOKIE = "btkr_dev_user";

/**
 * Resolve the *current* request's actor (authenticated user + permissions).
 *
 * Phase 1 (this file): dev-mode shim. Resolution order:
 *   1. `btkr_dev_user` cookie (set by the /dev role switcher) — dev only
 *   2. `BTKR_DEV_USER` env — dev default
 * The resolved email is looked up in `users`; its roles drive the
 * permission set.
 *
 * Phase 1.5 (planned): replaces this with a real session lookup — read the
 * session cookie, look up the `sessions` row, verify expiry + revocation,
 * then call `resolveActor()` for the authenticated `users.id`. The SSO
 * adapters in `lib/auth/sso/` produce the identity that creates the session.
 *
 * Cached per-request via React's `cache` so multiple protected boundaries
 * in the same render share one DB round-trip.
 *
 * @example
 * const actor = await getCurrentActor();
 * assertPermission(actor, "byok-key:read");
 *
 * @throws {NotAuthenticated} when no actor can be resolved.
 */
export const getCurrentActor = cache(async (): Promise<Actor> => {
  const isProd = process.env.NODE_ENV === "production";
  let email = process.env.BTKR_DEV_USER;

  if (!isProd) {
    const cookieStore = await cookies();
    const fromCookie = cookieStore.get(DEV_USER_COOKIE)?.value;
    if (fromCookie) email = fromCookie;
  }

  if (isProd && email) {
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
