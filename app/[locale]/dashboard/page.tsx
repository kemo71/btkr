import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { getCurrentActor } from "@/lib/auth/current-actor";
import { can } from "@/lib/rbac";
import { Badge, Card, CardBody, CardHeader } from "@/components/dga";
import { LocaleSwitcher } from "@/components/ui/locale-switcher";
import { FunnelChart } from "@/components/dashboard/funnel-chart";
import { DonutChart, type DonutSlice } from "@/components/dashboard/donut-chart";
import {
  funnelByStage,
  topContributors,
  methodologyAdoption,
  recentGateDecisions,
  headlineKpis,
} from "@/lib/dashboard/queries";
import { STAGES, stageTone, type Stage } from "@/lib/lifecycle/stages";
import { FRAMEWORKS } from "@/lib/frameworks";
import type { Locale } from "@/i18n/routing";

export const dynamic = "force-dynamic";

const FRAMEWORK_COLORS: Record<string, string> = {
  triz: "var(--color-primary-600)",
  sit: "var(--color-info-500)",
  jtbd: "var(--color-warning-500)",
  "six-hats": "var(--color-success-500)",
  "design-thinking": "var(--color-danger-500)",
  none: "var(--color-neutral-400)",
};

/**
 * Strategic Dashboard — Stakeholder-facing.
 *
 * Densifies the funnel data with all 9 stages (even zero counts) so the
 * shape of the funnel is always legible.
 */
export default async function DashboardPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("dashboard");
  const ti = await getTranslations("ideas");
  const tf = await getTranslations("frameworks");

  const actor = await getCurrentActor();
  if (!can(actor, "idea:read")) {
    redirect(locale === "ar" ? "/" : `/${locale}`);
  }

  const [funnel, contributors, adoption, decisions, kpis] = await Promise.all([
    funnelByStage(),
    topContributors(5),
    methodologyAdoption(),
    recentGateDecisions(8),
    headlineKpis(),
  ]);

  // Densify funnel with zero-count stages so the chart always shows the full FSM.
  const funnelByStageMap = new Map(funnel.map((f) => [f.stage, f.count]));
  const denseFunnel = STAGES.filter(
    (s) => s !== "draft" && s !== "archived",
  ).map((s) => ({
    stage: s,
    count: funnelByStageMap.get(s) ?? 0,
  }));

  const stageLabels = Object.fromEntries(
    STAGES.map((s) => [s, ti(`stages.${s}`)]),
  ) as Record<Stage, string>;

  const adoptionSlices: DonutSlice[] = adoption.map((a) => ({
    label:
      a.framework === "none" ? t("methodology.none") : tf(`names.${a.framework}`),
    value: a.count,
    color: FRAMEWORK_COLORS[a.framework] ?? "var(--color-neutral-400)",
  }));

  return (
    <main className="mx-auto flex min-h-dvh max-w-6xl flex-col gap-8 px-6 py-12">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-semibold tracking-tight text-neutral-900">
            {t("page.title")}
          </h1>
          <p className="mt-2 text-base text-neutral-600">{t("page.subtitle")}</p>
        </div>
        <LocaleSwitcher />
      </header>

      <section className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardBody className="flex flex-col gap-1">
            <span className="text-xs uppercase tracking-wide text-neutral-500">
              {t("kpis.totalIdeas")}
            </span>
            <span className="text-3xl font-semibold tabular-nums text-neutral-900">
              {kpis.totalIdeas}
            </span>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="flex flex-col gap-1">
            <span className="text-xs uppercase tracking-wide text-neutral-500">
              {t("kpis.activeIdeas")}
            </span>
            <span className="text-3xl font-semibold tabular-nums text-primary-700">
              {kpis.activeIdeas}
            </span>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="flex flex-col gap-1">
            <span className="text-xs uppercase tracking-wide text-neutral-500">
              {t("kpis.approvalRate")}
            </span>
            <span className="text-3xl font-semibold tabular-nums text-success-600">
              {Math.round(kpis.approvalRate * 100)}%
            </span>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="flex flex-col gap-1">
            <span className="text-xs uppercase tracking-wide text-neutral-500">
              {t("kpis.totalUsers")}
            </span>
            <span className="text-3xl font-semibold tabular-nums text-neutral-900">
              {kpis.totalUsers}
            </span>
          </CardBody>
        </Card>
      </section>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title={t("funnel.title")} subtitle={t("funnel.subtitle")} />
          <CardBody>
            <FunnelChart data={denseFunnel} stageLabels={stageLabels} />
          </CardBody>
        </Card>

        <Card>
          <CardHeader title={t("methodology.title")} />
          <CardBody>
            {adoptionSlices.length === 0 ? (
              <p className="text-sm text-neutral-500">{t("methodology.empty")}</p>
            ) : (
              <DonutChart slices={adoptionSlices} />
            )}
          </CardBody>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title={t("contributors.title")} />
          <CardBody>
            {contributors.length === 0 ? (
              <p className="text-sm text-neutral-500">{t("contributors.empty")}</p>
            ) : (
              <ol className="flex flex-col divide-y divide-neutral-100">
                {contributors.map((c, i) => (
                  <li
                    key={c.userId}
                    className="flex items-center justify-between gap-3 py-2.5"
                  >
                    <div className="flex items-center gap-3">
                      <span className="size-7 shrink-0 rounded-full bg-primary-50 text-center text-sm font-semibold leading-7 text-primary-700">
                        {i + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-neutral-900">
                          {c.fullName}
                        </p>
                        {c.department ? (
                          <p className="truncate text-xs text-neutral-500">
                            {c.department}
                          </p>
                        ) : null}
                      </div>
                    </div>
                    <Badge tone="primary">
                      {t("contributors.ideas", { count: c.ideas })}
                    </Badge>
                  </li>
                ))}
              </ol>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title={t("decisions.title")} />
          <CardBody>
            {decisions.length === 0 ? (
              <p className="text-sm text-neutral-500">{t("decisions.empty")}</p>
            ) : (
              <ul className="flex flex-col divide-y divide-neutral-100">
                {decisions.map((d) => (
                  <li key={d.id} className="flex flex-col gap-1 py-2.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone={d.eventType === "gate-approval" ? "success" : "danger"} dot>
                        {d.eventType === "gate-approval"
                          ? t("decisions.approved")
                          : t("decisions.rejected")}
                      </Badge>
                      <span dir="ltr" className="text-xs tabular-nums text-neutral-500">
                        {d.ideaCode}
                      </span>
                      <Badge tone={stageTone(d.toStage)}>
                        {ti(`stages.${d.toStage}`)}
                      </Badge>
                    </div>
                    <p className="truncate text-sm font-medium text-neutral-900">
                      {d.ideaTitle}
                    </p>
                    <p className="text-xs text-neutral-500">
                      {d.actorName}
                      {" · "}
                      <time dir="ltr" dateTime={d.occurredAt.toISOString()}>
                        {d.occurredAt.toISOString().slice(0, 16).replace("T", " ")}
                      </time>
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>
    </main>
  );
}
