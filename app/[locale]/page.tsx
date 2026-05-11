import { getTranslations, setRequestLocale } from "next-intl/server";
import { LocaleSwitcher } from "@/components/ui/locale-switcher";
import type { Locale } from "@/i18n/routing";

/**
 * Btkr Valley landing page.
 *
 * Renders Arabic-first content; uses locale-aware translations from
 * `locales/<locale>/common.json`. Layout uses CSS logical properties
 * (ps/pe/ms/me) so it mirrors automatically under RTL.
 */
export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("home");

  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col items-start justify-center gap-6 px-6 py-16">
      <header className="flex w-full items-center justify-between">
        <span className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-neutral-50 px-3 py-1 text-xs font-medium text-neutral-700 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300">
          <span aria-hidden className="size-1.5 rounded-full bg-emerald-500" />
          {t("badge")}
        </span>
        <LocaleSwitcher />
      </header>

      <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
        {t("title")}
      </h1>

      <p className="max-w-prose text-base text-neutral-600 dark:text-neutral-400">
        {t("description")}
      </p>

      <div className="flex flex-wrap gap-3 pt-2">
        <a
          href="https://github.com/kemo71/btkr/tree/main/docs/togaf"
          target="_blank"
          rel="noreferrer"
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
        >
          {t("ctaArchitecture")}
        </a>
        <a
          href="https://web.dev/progressive-web-apps/"
          className="rounded-md border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-900 transition hover:bg-neutral-50 dark:border-neutral-800 dark:text-neutral-100 dark:hover:bg-neutral-900"
        >
          {t("ctaPwa")}
        </a>
      </div>
    </main>
  );
}
