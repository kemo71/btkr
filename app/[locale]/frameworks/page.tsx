import { getTranslations, setRequestLocale } from "next-intl/server";
import { Wizard } from "@/components/frameworks/wizard";
import { LocaleSwitcher } from "@/components/ui/locale-switcher";
import type { Locale } from "@/i18n/routing";

/**
 * Methodology Wizard route.
 *
 * Renders the framework recommender. The actual interactivity lives in the
 * client component `<Wizard />`; this page is a thin server shell that loads
 * translations and the page chrome.
 *
 * @see lib/frameworks/selector.ts
 * @see docs/togaf/01-business-architecture.md §4 (Capabilities — Methodology)
 */
export default async function FrameworksPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("frameworks");

  return (
    <main className="mx-auto flex min-h-dvh max-w-6xl flex-col gap-8 px-6 py-12">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-semibold tracking-tight text-neutral-900">
            {t("page.title")}
          </h1>
          <p className="mt-2 max-w-prose text-base text-neutral-600">
            {t("page.subtitle")}
          </p>
        </div>
        <LocaleSwitcher />
      </header>

      <Wizard />
    </main>
  );
}
