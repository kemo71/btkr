import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { getCurrentActor } from "@/lib/auth/current-actor";
import { can } from "@/lib/rbac";
import { Card, CardBody, CardHeader, Badge } from "@/components/dga";
import { LocaleSwitcher } from "@/components/ui/locale-switcher";
import { CoachChat } from "@/components/coach/coach-chat";
import { FRAMEWORKS } from "@/lib/frameworks";
import type { Locale } from "@/i18n/routing";

export const dynamic = "force-dynamic";

/**
 * AI Innovation Coach page.
 *
 * Server renders the chrome; the chat itself is a client component that
 * talks to `/api/coach` over a streaming response. Pre-selects a framework
 * if `?framework=<slug>` is in the query string.
 */
export default async function CoachPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: Locale }>;
  searchParams: Promise<{ framework?: string }>;
}) {
  const { locale } = await params;
  const { framework: qsFramework } = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations("coach");
  const tf = await getTranslations("frameworks");

  const actor = await getCurrentActor();
  if (!can(actor, "coach:use")) {
    redirect(locale === "ar" ? "/" : `/${locale}`);
  }

  const allowed = new Set(FRAMEWORKS.map((f) => f.slug));
  const initialFramework =
    qsFramework && allowed.has(qsFramework as (typeof FRAMEWORKS)[number]["slug"])
      ? (qsFramework as (typeof FRAMEWORKS)[number]["slug"])
      : null;

  const frameworkOptions = FRAMEWORKS.map((f) => ({
    slug: f.slug,
    label: tf(`names.${f.slug}`),
  }));

  return (
    <main className="mx-auto flex min-h-dvh max-w-4xl flex-col gap-8 px-6 py-12">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-semibold tracking-tight text-neutral-900">
            {t("page.title")}
          </h1>
          <p className="mt-2 text-base text-neutral-600">{t("page.subtitle")}</p>
        </div>
        <LocaleSwitcher />
      </header>

      <Badge tone="info">
        {t("page.byokNotice")}
      </Badge>

      <Card>
        <CardHeader title={t("chat.title")} subtitle={t("chat.subtitle")} />
        <CardBody>
          <CoachChat
            initialFramework={initialFramework}
            locale={locale}
            frameworks={frameworkOptions}
            labels={{
              framework: t("chat.framework"),
              general: t("chat.general"),
              you: t("chat.you"),
              coach: t("chat.coach"),
              placeholder: t("chat.placeholder"),
              send: t("chat.send"),
              sending: t("chat.sending"),
              streamError: t("chat.streamError"),
              empty: t("chat.empty"),
            }}
          />
        </CardBody>
      </Card>
    </main>
  );
}
