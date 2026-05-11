import { NextResponse, type NextRequest } from "next/server";
import { resolveSession, destroyCurrentSession } from "@/lib/auth/session";
import { audit } from "@/lib/audit/writer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Logout — revoke the current session and clear the cookie.
 *
 * Accepts GET (for a simple link) and POST. Always redirects to `/`.
 *
 * @see lib/auth/session.ts
 */
async function logout(req: NextRequest): Promise<Response> {
  const session = await resolveSession();
  await destroyCurrentSession();
  await audit({
    category: "auth",
    action: "auth.logout",
    outcome: "success",
    actorId: session?.userId ?? null,
    ipAddress: req.headers.get("x-forwarded-for"),
    userAgent: req.headers.get("user-agent"),
  });
  return NextResponse.redirect(new URL("/", req.nextUrl.origin));
}

export const GET = logout;
export const POST = logout;
