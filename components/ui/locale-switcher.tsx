"use client";

import { useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";

/**
 * Inline locale switcher.
 *
 * Renders the *other* available locale as a clickable link (since this app
 * only supports two locales, a toggle is friendlier than a dropdown).
 * Clicking swaps the locale in the URL via `useRouter` from `next-intl/navigation`,
 * which preserves the current pathname.
 *
 * @example
 * <LocaleSwitcher />
 */
export function LocaleSwitcher() {
  const t = useTranslations("locale");
  const locale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();

  const next: Locale = locale === "ar" ? "en" : "ar";

  function onSwitch() {
    startTransition(() => {
      router.replace(pathname, { locale: next });
    });
  }

  return (
    <button
      type="button"
      onClick={onSwitch}
      disabled={pending}
      aria-label={t("switchTo")}
      lang={next}
      dir={next === "ar" ? "rtl" : "ltr"}
      className="inline-flex items-center gap-1.5 rounded-md border border-neutral-200 px-2.5 py-1 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50 disabled:opacity-50 dark:border-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-900"
    >
      <span aria-hidden>{next === "ar" ? "ع" : "EN"}</span>
      <span>{t(next)}</span>
    </button>
  );
}

LocaleSwitcher.locales = routing.locales;
