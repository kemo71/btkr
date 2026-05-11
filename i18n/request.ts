import { getRequestConfig } from "next-intl/server";
import { hasLocale } from "next-intl";
import { routing, type Locale } from "./routing";

/**
 * Per-request next-intl configuration.
 *
 * Loads all message namespaces for the active locale and merges them under
 * their namespace keys. Namespaces are:
 *   - common      — app-wide chrome (header, locale switcher, home)
 *   - frameworks  — Methodology Wizard
 *
 * Add a namespace: drop a JSON file at `locales/<locale>/<name>.json` and
 * register it in `NAMESPACES` below.
 *
 * @see https://next-intl.dev/docs/getting-started/app-router
 */
const NAMESPACES = [
  "common",
  "frameworks",
  "byok",
  "ideas",
  "coach",
  "dashboard",
  "leaderboard",
] as const;

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale: Locale = hasLocale(routing.locales, requested)
    ? requested
    : routing.defaultLocale;

  const loaded = await Promise.all(
    NAMESPACES.map(async (ns) => {
      const mod = await import(`../locales/${locale}/${ns}.json`);
      return [ns, mod.default] as const;
    }),
  );

  // Merge common into the root (preserve flat keys) AND expose frameworks/etc
  // as nested namespaces. So callers can do `t("home.title")` for common keys
  // OR `useTranslations("frameworks")` for the nested namespace.
  const messages: Record<string, unknown> = {};
  for (const [ns, body] of loaded) {
    if (ns === "common") {
      Object.assign(messages, body);
    } else {
      messages[ns] = body;
    }
  }

  return { locale, messages };
});
