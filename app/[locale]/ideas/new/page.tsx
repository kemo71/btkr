import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { getCurrentActor } from "@/lib/auth/current-actor";
import { can } from "@/lib/rbac";
import { Card, CardBody, CardHeader } from "@/components/dga";
import { LocaleSwitcher } from "@/components/ui/locale-switcher";
import { IdeaCreateForm } from "@/components/lifecycle/idea-create-form";
import { FRAMEWORKS } from "@/lib/frameworks";
import type { Locale } from "@/i18n/routing";

export const dynamic = "force-dynamic";

/**
 * "New idea" route.
 *
 * Server-renders the form chrome; the actual form is a client component
 * bound to the server action.
 */
export default async function NewIdeaPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("ideas");
  const tf = await getTranslations("frameworks");

  const actor = await getCurrentActor();
  if (!can(actor, "idea:create")) {
    redirect(locale === "ar" ? "/ideas" : `/${locale}/ideas`);
  }

  const frameworkOptions = FRAMEWORKS.map((f) => ({
    slug: f.slug,
    label: tf(`names.${f.slug}`),
  }));

  return (
    <main className="mx-auto flex min-h-dvh max-w-3xl flex-col gap-8 px-6 py-12">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-semibold tracking-tight text-neutral-900">
            {t("new.title")}
          </h1>
          <p className="mt-2 text-base text-neutral-600">{t("new.subtitle")}</p>
        </div>
        <LocaleSwitcher />
      </header>

      <Card>
        <CardHeader title={t("new.formTitle")} />
        <CardBody>
          <IdeaCreateForm
            frameworks={frameworkOptions}
            labels={{
              titleAr: t("fields.titleAr"),
              titleEn: t("fields.titleEn"),
              summaryAr: t("fields.summaryAr"),
              body: t("fields.body"),
              department: t("fields.department"),
              innovationType: t("fields.innovationType"),
              framework: t("fields.framework"),
              frameworkNone: t("fields.frameworkNone"),
              innovationTypeIncremental: t("innovationType.incremental"),
              innovationTypeAdjacent: t("innovationType.adjacent"),
              innovationTypeDisruptive: t("innovationType.disruptive"),
              submit: t("new.submit"),
            }}
          />
        </CardBody>
      </Card>
    </main>
  );
}
