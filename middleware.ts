import { type NextRequest, NextResponse } from "next/server";
import createIntlMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

/**
 * Next.js middleware — runs on every matched request.
 *
 * Responsibilities (in order):
 *   1. Locale routing via next-intl (`/` -> ar, `/en/...` -> en).
 *   2. Inject a fresh per-request CSP nonce as a request header so RSC
 *      can read it via `headers().get("x-csp-nonce")` and put it on any
 *      inline script tag.
 *   3. Attach strict NCA-aligned security headers to the response.
 *
 * Inline scripts without the nonce are blocked by the browser — a
 * defensive layer beyond React's auto-escaping. nginx adds the same
 * headers belt-and-suspenders for on-prem deploys.
 *
 * @see infra/nginx/nginx.conf
 * @see docs/security/nca-ecc-mapping.md §2-7 (Application Security)
 */

const intlMiddleware = createIntlMiddleware(routing);

function buildCsp(nonce: string, isDev: boolean): string {
  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],
    "base-uri": ["'self'"],
    "frame-ancestors": ["'none'"],
    "form-action": ["'self'"],
    "object-src": ["'none'"],
    "script-src": [
      "'self'",
      `'nonce-${nonce}'`,
      "'strict-dynamic'",
      ...(isDev ? ["'unsafe-eval'"] : []),
    ],
    // Tailwind v4 + next/font inject inline <style>; required even with nonce
    // because RSC streams styles independently of script blocks.
    "style-src": ["'self'", "'unsafe-inline'"],
    "img-src": ["'self'", "data:", "blob:"],
    "font-src": ["'self'", "data:"],
    "connect-src": ["'self'", ...(isDev ? ["ws:"] : [])],
    "manifest-src": ["'self'"],
    "worker-src": ["'self'"],
    "frame-src": ["'none'"],
    "upgrade-insecure-requests": [],
  };
  return Object.entries(directives)
    .map(([k, v]) => (v.length ? `${k} ${v.join(" ")}` : k))
    .join("; ");
}

function applySecurityHeaders(
  res: NextResponse,
  nonce: string,
  isDev: boolean,
): NextResponse {
  res.headers.set("content-security-policy", buildCsp(nonce, isDev));
  res.headers.set("x-content-type-options", "nosniff");
  res.headers.set("x-frame-options", "DENY");
  res.headers.set("referrer-policy", "strict-origin-when-cross-origin");
  res.headers.set(
    "permissions-policy",
    "geolocation=(), microphone=(), camera=(), payment=()",
  );
  if (!isDev) {
    res.headers.set(
      "strict-transport-security",
      "max-age=31536000; includeSubDomains",
    );
  }
  return res;
}

export default function middleware(req: NextRequest): NextResponse {
  const nonce = crypto.randomUUID().replace(/-/g, "");
  const isDev = process.env.NODE_ENV !== "production";

  // Forward the nonce + the request path to RSC via request headers.
  // (`x-pathname` lets `requireActor()` build a returnTo for /auth/login.)
  req.headers.set("x-csp-nonce", nonce);
  req.headers.set("x-pathname", req.nextUrl.pathname);

  // Run next-intl. It returns a NextResponse (rewrite/redirect) or null.
  const intlResponse = intlMiddleware(req);
  const response = intlResponse ?? NextResponse.next();

  return applySecurityHeaders(response, nonce, isDev);
}

export const config = {
  // Exclude the SSO route *handlers* (login/callback/logout/saml) — those are
  // locale-agnostic API-style endpoints. `/auth/mfa` IS a page under
  // `app/[locale]/...`, so it must pass through next-intl to get a locale.
  matcher: [
    "/((?!api|auth/login|auth/callback|auth/logout|auth/saml|_next|_vercel|sw\\.js|manifest\\.webmanifest|icon|apple-icon|icons|.*\\..*).*)",
  ],
};
