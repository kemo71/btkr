import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import {
  getOidcAdapter,
  openLoginState,
  LOGIN_STATE_COOKIE,
} from "@/lib/auth/sso/provider";
import { createSessionForIdentity } from "@/lib/auth/session";
import { audit } from "@/lib/audit/writer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /auth/callback — OIDC redirect handler.
 *
 * Reads the signed login-state cookie, verifies `state`, exchanges the
 * `code` (with the PKCE verifier), validates the `id_token`, upserts the
 * user, creates a session, then 302s to `returnTo` — or `/auth/mfa` if a
 * privileged role requires a second factor the IdP didn't assert.
 *
 * @see app/auth/login/route.ts
 * @see lib/auth/session.ts
 */
export async function GET(req: NextRequest): Promise<Response> {
  const jar = await cookies();
  const sealed = jar.get(LOGIN_STATE_COOKIE)?.value;
  if (!sealed) {
    await audit({
      category: "auth",
      action: "auth.callback",
      outcome: "failure",
      details: { reason: "missing_login_state" },
    });
    return NextResponse.redirect(new URL("/auth/login", req.nextUrl.origin));
  }

  // Clear the one-time login-state cookie regardless of outcome.
  jar.delete(LOGIN_STATE_COOKIE);

  let identity;
  let returnTo = "/";
  try {
    const loginState = await openLoginState(sealed);
    returnTo = loginState.returnTo;
    const oidc = getOidcAdapter();
    identity = await oidc.exchangeCallback(req, loginState);
  } catch (err) {
    await audit({
      category: "auth",
      action: "auth.callback",
      outcome: "failure",
      details: { error: err instanceof Error ? err.message : "unknown" },
      ipAddress: req.headers.get("x-forwarded-for"),
      userAgent: req.headers.get("user-agent"),
    });
    return NextResponse.redirect(
      new URL("/auth/login?error=callback", req.nextUrl.origin),
    );
  }

  const { userId, roleSlugs, mfaPending } = await createSessionForIdentity(
    identity,
    {
      ipAddress: req.headers.get("x-forwarded-for"),
      userAgent: req.headers.get("user-agent"),
    },
  );

  await audit({
    category: "auth",
    action: "auth.login.success",
    outcome: "success",
    actorId: userId,
    actorRoleSlug: roleSlugs[0] ?? null,
    details: { mfaPending, mechanism: "oidc" },
    ipAddress: req.headers.get("x-forwarded-for"),
    userAgent: req.headers.get("user-agent"),
  });

  const dest = mfaPending ? "/auth/mfa" : returnTo;
  return NextResponse.redirect(new URL(dest, req.nextUrl.origin));
}
