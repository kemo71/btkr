import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { listIdeas } from "@/lib/lifecycle/store";
import { stageTone } from "@/lib/lifecycle/stages";
import { requireActor } from "@/lib/auth/current-actor";
import { can } from "@/lib/rbac";
import { Badge, Card, CardBody, CardHeader } from "@/components/dga";
import { LocaleSwitcher } from "@/components/ui/locale-switcher";
import type { Locale } from "@/i18n/routing";

export const dynamic = "force-dynamic";

/**
 * Ideas list — every idea visible to the current actor.
 *
 * Phase 1 returns the full set; row-level visibility (own / department /
 * org-wide) lands with the scoped RBAC slice.
 */
export default async function IdeasPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("ideas");

  const actor = await requireActor("idea:read");
  const ideas = await listIdeas();
  const canCreate = can(actor, "idea:create");
  const baseHref = locale === "ar" ? "/ideas" : `/${locale}/ideas`;

  return (
    <main className="mx-auto flex min-h-dvh max-w-5xl flex-col gap-8 px-6 py-12">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-semibold tracking-tight text-neutral-900">
            {t("page.title")}
          </h1>
          <p className="mt-2 text-base text-neutral-600">
            {t("page.subtitle", { count: ideas.length })}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <LocaleSwitcher />
          {canCreate ? (
            <Link
              href={`${baseHref}/new`}
              className="inline-flex h-10 items-center justify-center rounded-md bg-primary-600 px-4 text-base font-medium text-white shadow-sm transition-colors hover:bg-primary-700"
            >
              {t("page.newIdea")}
            </Link>
          ) : null}
        </div>
      </header>

      {ideas.length === 0 ? (
        <Card>
          <CardBody className="py-12 text-center">
            <p className="text-neutral-500">{t("list.empty")}</p>
          </CardBody>
        </Card>
      ) : (
        <Card>
          <CardHeader title={t("list.title")} />
          <CardBody>
            <ul className="flex flex-col divide-y divide-neutral-100">
              {ideas.map((i) => (
                <li key={i.id}>
                  <Link
                    href={`${baseHref}/${i.code}`}
                    className="flex flex-wrap items-center justify-between gap-3 px-2 py-4 transition-colors hover:bg-neutral-50"
                  >
                    <div className="flex min-w-0 flex-col">
                      <div className="flex items-center gap-2">
                        <Badge tone={stageTone(i.stage)} dot>
                          {t(`stages.${i.stage}`)}
                        </Badge>
                        <span className="text-xs tabular-nums text-neutral-500" dir="ltr">
                          {i.code}
                        </span>
                        <Badge tone="neutral">
                          {t(`innovationType.${i.innovationType}`)}
                        </Badge>
                      </div>
                      <h3 className="mt-1 truncate text-lg font-medium text-neutral-900">
                        {locale === "ar" ? i.titleAr : i.titleEn ?? i.titleAr}
                      </h3>
                      <p className="mt-0.5 truncate text-xs text-neutral-500">
                        {i.authorName}
                        {i.department ? ` · ${i.department}` : null}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-neutral-500">
                      <span aria-label={t("list.votes")} className="inline-flex items-center gap-1">
                        <span aria-hidden>▲</span>
                        <span className="tabular-nums">{i.voteCount}</span>
                      </span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      )}
    </main>
  );
}
