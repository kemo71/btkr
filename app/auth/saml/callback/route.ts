import { NextResponse, type NextRequest } from "next/server";
import { getSsoAdapter } from "@/lib/auth/sso/provider";
import { createSessionForIdentity } from "@/lib/auth/session";
import { audit } from "@/lib/audit/writer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /auth/saml/callback — SAML 2.0 Assertion Consumer Service (ACS).
 *
 * The IdP POSTs a `SAMLResponse` (and optional `RelayState` carrying the
 * post-login `returnTo` path). We validate the assertion's XML signature,
 * conditions, and audience via node-saml, upsert the user, create a
 * session, and 302 to `returnTo` (or `/auth/mfa` if MFA is pending).
 *
 * @see lib/auth/sso/saml.ts
 * @see lib/auth/session.ts
 */
export async function POST(req: NextRequest): Promise<Response> {
  const adapter = getSsoAdapter();
  if (!adapter || adapter.kind !== "saml") {
    return NextResponse.json({ error: "saml_not_configured" }, { status: 503 });
  }

  // Read the form body once; node-saml needs SAMLResponse, we want RelayState.
  const form = await req.formData();
  const relayState = form.get("RelayState");
  const returnTo =
    typeof relayState === "string" &&
    relayState.startsWith("/") &&
    !relayState.startsWith("//")
      ? relayState
      : "/";

  // Reconstruct a Request with the same body for the adapter to consume.
  const samlResponse = form.get("SAMLResponse");
  if (typeof samlResponse !== "string") {
    await audit({
      category: "auth",
      action: "auth.saml.callback",
      outcome: "failure",
      details: { reason: "missing_saml_response" },
    });
    return NextResponse.redirect(new URL("/auth/login?error=saml", req.nextUrl.origin));
  }

  let identity;
  try {
    const body = new FormData();
    body.set("SAMLResponse", samlResponse);
    identity = await adapter.handleCallback(
      new Request(req.url, { method: "POST", body }),
    );
  } catch (err) {
    await audit({
      category: "auth",
      action: "auth.saml.callback",
      outcome: "failure",
      details: { error: err instanceof Error ? err.message : "unknown" },
      ipAddress: req.headers.get("x-forwarded-for"),
      userAgent: req.headers.get("user-agent"),
    });
    return NextResponse.redirect(
      new URL("/auth/login?error=saml", req.nextUrl.origin),
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
    details: { mfaPending, mechanism: "saml" },
    ipAddress: req.headers.get("x-forwarded-for"),
    userAgent: req.headers.get("user-agent"),
  });

  return NextResponse.redirect(
    new URL(mfaPending ? "/auth/mfa" : returnTo, req.nextUrl.origin),
  );
}
