import "server-only";
import { eq } from "drizzle-orm";
import { cache } from "react";
import { cookies } from "next/headers";
import { db, schema } from "@/lib/db/client";
import { resolveActor, type Actor } from "@/lib/rbac";
import { resolveSession } from "./session";

/** Dev-only cookie that overrides BTKR_DEV_USER per browser session. */
export const DEV_USER_COOKIE = "btkr_dev_user";

/**
 * Resolve the *current* request's actor (authenticated user + permissions).
 *
 * Resolution order:
 *   1. **Real session** — the `btkr_session` cookie (set after SSO + MFA).
 *      A session with `mfaPending === true` is treated as unauthenticated
 *      here; only the `/auth/mfa` flow may act on it (it calls
 *      `resolveSession()` directly).
 *   2. **Dev shim** — non-production only: `btkr_dev_user` cookie, then
 *      `BTKR_DEV_USER` env. Lets protected routes be exercised without an
 *      IdP. Hard-disabled in production.
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

  // 1. Real session.
  const session = await resolveSession();
  if (session) {
    if (session.mfaPending) {
      throw new NotAuthenticated("MFA verification required.");
    }
    const [user] = await db
      .select({ id: schema.users.id, isActive: schema.users.isActive })
      .from(schema.users)
      .where(eq(schema.users.id, session.userId));
    if (!user) throw new NotAuthenticated("Session user not found.");
    if (!user.isActive) throw new NotAuthenticated("Account is deactivated.");
    return resolveActor(user.id);
  }

  // 2. Dev shim (never in production).
  if (isProd) {
    throw new NotAuthenticated("Not signed in.");
  }
  const jar = await cookies();
  const email = jar.get(DEV_USER_COOKIE)?.value ?? process.env.BTKR_DEV_USER;
  if (!email) {
    throw new NotAuthenticated(
      "No current actor. In dev, sign in via /auth/login or set BTKR_DEV_USER (or visit /dev).",
    );
  }
  const [user] = await db
    .select({ id: schema.users.id, isActive: schema.users.isActive })
    .from(schema.users)
    .where(eq(schema.users.email, email));
  if (!user) {
    throw new NotAuthenticated(`Dev user ${email} not found. Run pnpm db:seed.`);
  }
  if (!user.isActive) {
    throw new NotAuthenticated(`Dev user ${email} is deactivated.`);
  }
  return resolveActor(user.id);
});

/**
 * Non-throwing variant — returns null for an unauthenticated request.
 *
 * @example
 * const actor = await tryGetCurrentActor();
 * if (!actor) redirect("/auth/login");
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
