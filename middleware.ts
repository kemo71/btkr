import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

/**
 * Next.js middleware — handles locale detection and redirection.
 *
 * - `/` → Arabic (default locale, served unprefixed)
 * - `/en/...` → English
 * - Any other unknown locale → fall back to Arabic
 */
export default createMiddleware(routing);

export const config = {
  // Skip static files, the API namespace, and Next internals
  matcher: [
    "/((?!api|_next|_vercel|sw\\.js|manifest\\.webmanifest|icon|apple-icon|icons|.*\\..*).*)",
  ],
};
