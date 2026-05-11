import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { and, eq, gt, isNull } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";
import type { SsoIdentity } from "./sso/types";

/**
 * Session management.
 *
 * A session token is 32 bytes of CSPRNG randomness, base64url-encoded, and
 * stored in an HTTP-only cookie. Only its SHA-256 hash lands in the
 * `sessions` table — the raw token never touches the DB. On each request,
 * `getCurrentActor()` hashes the cookie value, looks up the row, and
 * checks `expires_at`, `revoked_at`, and `mfa_pending`.
 *
 * MFA: a freshly created session for a privileged role may be in
 * `mfa_pending` state when the IdP did not assert MFA. The actor resolver
 * treats such sessions as unauthenticated for everything except the
 * `/auth/mfa` flow, which flips `mfa_pending` to false on a successful
 * TOTP verification. The pending state lives in the DB, not the cookie, so
 * tampering with the cookie can't bypass it.
 *
 * @see lib/auth/current-actor.ts (consumer)
 * @see lib/auth/sso/types.ts (identity contract)
 * @see docs/security/nca-ecc-mapping.md §2-2-5 (session timeouts)
 */

export const SESSION_COOKIE = "btkr_session";

/** TTL in seconds. Privileged roles get a shorter window (ECC-2-2-5). */
const TTL_DEFAULT = 8 * 60 * 60; // 8h
const TTL_PRIVILEGED = 30 * 60; // 30m
const PRIVILEGED_ROLES = new Set(["admin", "stakeholder"]);

function hashToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

/** True iff any of the user's roles requires MFA. */
export function rolesRequireMfa(roleSlugs: readonly string[]): boolean {
  return roleSlugs.some((r) => PRIVILEGED_ROLES.has(r));
}

/** Upsert the user identified by an SSO identity; returns the user id + roles. */
async function upsertUserFromSso(identity: SsoIdentity): Promise<{
  userId: string;
  roleSlugs: string[];
}> {
  const [bySubject] = await db
    .select({ id: schema.users.id })
    .from(schema.users)
    .where(eq(schema.users.ssoSubject, identity.subject))
    .limit(1);

  let userId: string;
  if (bySubject) {
    userId = bySubject.id;
    await db
      .update(schema.users)
      .set({
        email: identity.email,
        fullName: identity.fullName,
        department: identity.department ?? null,
        preferredLocale: identity.preferredLocale ?? "ar",
        lastLoginAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(schema.users.id, userId));
  } else {
    const [byEmail] = await db
      .select({ id: schema.users.id })
      .from(schema.users)
      .where(eq(schema.users.email, identity.email))
      .limit(1);
    if (byEmail) {
      userId = byEmail.id;
      await db
        .update(schema.users)
        .set({
          ssoSubject: identity.subject,
          fullName: identity.fullName,
          department: identity.department ?? null,
          preferredLocale: identity.preferredLocale ?? "ar",
          lastLoginAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(schema.users.id, userId));
    } else {
      const [inserted] = await db
        .insert(schema.users)
        .values({
          email: identity.email,
          fullName: identity.fullName,
          department: identity.department ?? null,
          preferredLocale: identity.preferredLocale ?? "ar",
          ssoSubject: identity.subject,
          lastLoginAt: new Date(),
        })
        .returning({ id: schema.users.id });
      userId = inserted.id;
      // First-login provisioning: grant the default `employee` role.
      const [employeeRole] = await db
        .select({ id: schema.roles.id })
        .from(schema.roles)
        .where(eq(schema.roles.slug, "employee"))
        .limit(1);
      if (employeeRole) {
        await db
          .insert(schema.userRoles)
          .values({ userId, roleId: employeeRole.id })
          .onConflictDoNothing();
      }
    }
  }

  const roleRows = await db
    .select({ slug: schema.roles.slug })
    .from(schema.userRoles)
    .innerJoin(schema.roles, eq(schema.roles.id, schema.userRoles.roleId))
    .where(eq(schema.userRoles.userId, userId));

  return { userId, roleSlugs: roleRows.map((r) => r.slug) };
}

/**
 * Create a session for an SSO identity and set the session cookie.
 *
 * @example
 * const { mfaPending } = await createSessionForIdentity(identity, meta);
 * redirect(mfaPending ? "/auth/mfa" : returnTo);
 */
export async function createSessionForIdentity(
  identity: SsoIdentity,
  meta: { ipAddress?: string | null; userAgent?: string | null },
): Promise<{ userId: string; roleSlugs: string[]; mfaPending: boolean }> {
  const { userId, roleSlugs } = await upsertUserFromSso(identity);
  const mfaPending = rolesRequireMfa(roleSlugs) && !identity.mfaSatisfied;

  const token = randomBytes(32).toString("base64url");
  const ttl = rolesRequireMfa(roleSlugs) ? TTL_PRIVILEGED : TTL_DEFAULT;
  const expiresAt = new Date(Date.now() + ttl * 1000);

  await db.insert(schema.sessions).values({
    userId,
    tokenHash: hashToken(token),
    userAgent: meta.userAgent ?? null,
    ipAddress: meta.ipAddress ?? null,
    expiresAt,
    mfaPending,
  });

  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: ttl,
  });

  return { userId, roleSlugs, mfaPending };
}

/** Flip the current session's `mfa_pending` to false (after TOTP verify). */
export async function completeMfaForCurrentSession(): Promise<boolean> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return false;
  const result = await db
    .update(schema.sessions)
    .set({ mfaPending: false })
    .where(
      and(
        eq(schema.sessions.tokenHash, hashToken(token)),
        eq(schema.sessions.mfaPending, true),
      ),
    );
  return (result as unknown as { count: number }).count > 0;
}

export interface ResolvedSession {
  userId: string;
  mfaPending: boolean;
}

/**
 * Resolve the current request's session from the cookie, or null if there
 * is none / it's expired / it's revoked. A `mfaPending` session is still
 * returned (so the MFA flow can identify the user) — callers other than
 * `/auth/mfa` must treat `mfaPending === true` as unauthenticated.
 *
 * @example
 * const s = await resolveSession();
 * if (!s || s.mfaPending) redirect("/auth/login");
 */
export async function resolveSession(): Promise<ResolvedSession | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const [row] = await db
    .select({
      userId: schema.sessions.userId,
      mfaPending: schema.sessions.mfaPending,
    })
    .from(schema.sessions)
    .where(
      and(
        eq(schema.sessions.tokenHash, hashToken(token)),
        gt(schema.sessions.expiresAt, new Date()),
        isNull(schema.sessions.revokedAt),
      ),
    )
    .limit(1);
  if (!row) return null;
  return { userId: row.userId, mfaPending: row.mfaPending };
}

/** Revoke the current session and clear the cookie (logout). */
export async function destroyCurrentSession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) {
    await db
      .update(schema.sessions)
      .set({ revokedAt: new Date() })
      .where(eq(schema.sessions.tokenHash, hashToken(token)));
  }
  jar.delete(SESSION_COOKIE);
}

/** Revoke every active session for a user (role change / compromise). */
export async function revokeAllSessions(userId: string): Promise<void> {
  await db
    .update(schema.sessions)
    .set({ revokedAt: new Date() })
    .where(
      and(eq(schema.sessions.userId, userId), isNull(schema.sessions.revokedAt)),
    );
}
