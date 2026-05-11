import { getRequestConfig } from "next-intl/server";
import { hasLocale } from "next-intl";
import { routing, type Locale } from "./routing";

/**
 * Per-request next-intl configuration.
 *
 * Loads the message catalog for the active locale from
 * `locales/<locale>/common.json`. Falls back to the default locale (Arabic)
 * if the requested locale is unknown or absent.
 *
 * @see https://next-intl.dev/docs/getting-started/app-router
 */
export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale: Locale = hasLocale(routing.locales, requested)
    ? requested
    : routing.defaultLocale;

  return {
    locale,
    messages: (await import(`../locales/${locale}/common.json`)).default,
  };
});
