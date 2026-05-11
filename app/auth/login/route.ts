import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import {
  getSsoAdapter,
  getOidcAdapter,
  sealLoginState,
  LOGIN_STATE_COOKIE,
} from "@/lib/auth/sso/provider";
import { audit } from "@/lib/audit/writer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /auth/login — start the SSO login flow.
 *
 * - OIDC: builds the authorization URL (PKCE), stashes the login state in a
 *   signed, 10-minute, HTTP-only cookie, and 302s to the IdP.
 * - SAML: delegates to the adapter's `buildLoginUrl` (slice 17).
 * - No SSO configured: in dev, 302 to `/dev` (the role switcher); in
 *   production, return 503 — the deployment must configure an IdP.
 *
 * `?returnTo=/path` controls where the user lands after login (defaults to
 * the locale root `/`). Only same-origin relative paths are honored.
 *
 * @see lib/auth/sso/provider.ts
 * @see app/auth/callback/route.ts
 */
export async function GET(req: NextRequest): Promise<Response> {
  const adapter = getSsoAdapter();
  const rawReturn = req.nextUrl.searchParams.get("returnTo") ?? "/";
  // Only allow same-origin relative paths.
  const returnTo = rawReturn.startsWith("/") && !rawReturn.startsWith("//")
    ? rawReturn
    : "/";

  if (!adapter) {
    if (process.env.NODE_ENV !== "production") {
      return NextResponse.redirect(new URL("/dev", req.nextUrl.origin));
    }
    return NextResponse.json(
      { error: "sso_not_configured" },
      { status: 503 },
    );
  }

  await audit({
    category: "auth",
    action: "auth.login.begin",
    outcome: "success",
    details: { mechanism: adapter.kind, returnTo },
    ipAddress: req.headers.get("x-forwarded-for"),
    userAgent: req.headers.get("user-agent"),
  });

  if (adapter.kind === "oidc") {
    const oidc = getOidcAdapter();
    const { url, loginState } = await oidc.beginLogin(returnTo);
    const sealed = await sealLoginState(loginState);
    const jar = await cookies();
    jar.set(LOGIN_STATE_COOKIE, sealed, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/auth",
      maxAge: 600,
    });
    return NextResponse.redirect(url);
  }

  // SAML
  const url = await adapter.buildLoginUrl({ returnTo, state: "" });
  return NextResponse.redirect(url);
}
