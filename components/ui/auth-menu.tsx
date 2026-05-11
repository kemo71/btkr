import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";
import { tryGetCurrentActor } from "@/lib/auth/current-actor";

/**
 * Compact auth control for page headers.
 *
 * - Signed in   → shows the display name (truncated) + a "Sign out" link
 *   (`/auth/logout`).
 * - Signed out  → shows a "Sign in" link (`/auth/login`).
 *
 * Server component — does its own actor lookup, so any page can drop it in
 * next to `<LocaleSwitcher />` without prop-drilling.
 *
 * @example
 * <header className="flex items-center gap-3">
 *   <LocaleSwitcher />
 *   <AuthMenu signInLabel="تسجيل الدخول" signOutLabel="خروج" />
 * </header>
 */
export async function AuthMenu({
  signInLabel,
  signOutLabel,
}: {
  signInLabel: string;
  signOutLabel: string;
}) {
  const actor = await tryGetCurrentActor();

  if (!actor) {
    return (
      // /auth/login is a Route Handler (does a 302 to the IdP), not a page —
      // a plain <a> full-navigation is correct here, not <Link>.
      // eslint-disable-next-line @next/next/no-html-link-for-pages
      <a
        href="/auth/login"
        className="inline-flex h-9 items-center rounded-md border border-primary-600 px-3 text-sm font-medium text-primary-700 transition-colors hover:bg-primary-50"
      >
        {signInLabel}
      </a>
    );
  }

  const [user] = await db
    .select({ fullName: schema.users.fullName })
    .from(schema.users)
    .where(eq(schema.users.id, actor.userId));

  return (
    <div className="inline-flex items-center gap-2">
      <span className="max-w-[12ch] truncate text-sm text-neutral-600">
        {user?.fullName ?? "—"}
      </span>
      {/* /auth/logout is a Route Handler (revokes the session, 302s home). */}
      {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
      <a
        href="/auth/logout"
        className="inline-flex h-9 items-center rounded-md border border-neutral-300 px-3 text-sm text-neutral-700 transition-colors hover:bg-neutral-50"
      >
        {signOutLabel}
      </a>
    </div>
  );
}
