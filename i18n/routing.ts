import { defineRouting } from "next-intl/routing";

/**
 * Routing configuration for Btkr Valley.
 *
 * Arabic is the canonical locale (Architecture Principle AP1 — Arabic-first,
 * RTL by default). It is served at the root URL (`/`); English is served at
 * `/en`. The DGA RTL convention applies to Arabic only.
 *
 * @see docs/togaf/01-business-architecture.md §8 (Architecture Principles)
 */
export const routing = defineRouting({
  locales: ["ar", "en"] as const,
  defaultLocale: "ar",
  localePrefix: "as-needed",
});

export type Locale = (typeof routing.locales)[number];

/**
 * Text direction for a given locale.
 *
 * @example
 * direction("ar") // "rtl"
 * direction("en") // "ltr"
 */
export function direction(locale: Locale): "rtl" | "ltr" {
  return locale === "ar" ? "rtl" : "ltr";
}
