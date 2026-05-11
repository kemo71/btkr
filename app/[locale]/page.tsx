import { getTranslations, setRequestLocale } from "next-intl/server";
import { LocaleSwitcher } from "@/components/ui/locale-switcher";
import { Badge, Card, CardBody, CardHeader } from "@/components/dga";
import type { Locale } from "@/i18n/routing";

/**
 * Btkr Valley landing page.
 *
 * Renders Arabic-first content using the DGA-aligned primitives in
 * `components/dga/`. Layout uses CSS logical properties so it mirrors
 * automatically under RTL.
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
    <main className="mx-auto flex min-h-dvh max-w-3xl flex-col gap-8 px-6 py-12">
      <header className="flex items-center justify-between">
        <Badge tone="success" dot>
          {t("badge")}
        </Badge>
        <LocaleSwitcher />
      </header>

      <section className="flex flex-col gap-4">
        <h1 className="text-5xl font-semibold tracking-tight text-neutral-900">
          {t("title")}
        </h1>
        <p className="max-w-prose text-lg text-neutral-600">
          {t("description")}
        </p>
        <div className="flex flex-wrap gap-3 pt-2">
          <a
            href="https://github.com/kemo71/btkr/tree/main/docs/togaf"
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-12 items-center justify-center rounded-lg bg-primary-600 px-5 text-lg font-medium text-white shadow-sm transition-colors duration-[var(--duration-base)] hover:bg-primary-700"
          >
            {t("ctaArchitecture")}
          </a>
          <a
            href="https://web.dev/progressive-web-apps/"
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-12 items-center justify-center rounded-lg border border-primary-600 px-5 text-lg font-medium text-primary-700 transition-colors duration-[var(--duration-base)] hover:bg-primary-50"
          >
            {t("ctaPwa")}
          </a>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader title={t("cards.lifecycle.title")} subtitle="V1" />
          <CardBody>
            <p className="text-sm text-neutral-600">
              {t("cards.lifecycle.body")}
            </p>
          </CardBody>
        </Card>
        <Card>
          <CardHeader title={t("cards.coach.title")} subtitle="AI · BYOK" />
          <CardBody>
            <p className="text-sm text-neutral-600">{t("cards.coach.body")}</p>
          </CardBody>
        </Card>
        <Card>
          <CardHeader title={t("cards.frameworks.title")} subtitle="V2" />
          <CardBody>
            <p className="text-sm text-neutral-600">
              {t("cards.frameworks.body")}
            </p>
          </CardBody>
        </Card>
      </section>
    </main>
  );
}
