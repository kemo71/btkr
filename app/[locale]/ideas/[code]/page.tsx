import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getIdeaByCode } from "@/lib/lifecycle/store";
import { nextStages, stageTone, type Stage } from "@/lib/lifecycle/stages";
import { requireActor } from "@/lib/auth/current-actor";
import { can } from "@/lib/rbac";
import { Badge, Card, CardBody, CardHeader } from "@/components/dga";
import { LocaleSwitcher } from "@/components/ui/locale-switcher";
import { VoteButton } from "@/components/lifecycle/vote-button";
import { GateDecisionForm } from "@/components/lifecycle/gate-decision-form";
import type { Locale } from "@/i18n/routing";

export const dynamic = "force-dynamic";

/**
 * Idea detail — shows the canonical record, the lifecycle timeline, and
 * (for stakeholders) the gate-decision form whenever a forward transition
 * is allowed.
 */
export default async function IdeaDetailPage({
  params,
}: {
  params: Promise<{ locale: Locale; code: string }>;
}) {
  const { locale, code } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("ideas");

  const actor = await requireActor("idea:read");

  const result = await getIdeaByCode(code);
  if (!result) notFound();

  const { idea, events, voteCount } = result;
  const stage = idea.stage as Stage;
  const canVote = can(actor, "idea:vote");
  const canGate = can(actor, "gate:approve") || can(actor, "gate:reject");
  const forward = nextStages(stage).filter(
    (s) => s !== "archived" && s !== "rejected",
  );

  const title = locale === "ar" ? idea.titleAr : idea.titleEn ?? idea.titleAr;
  const summary = idea.summaryAr;
  const bodyMarkdown =
    idea.body && typeof idea.body === "object" && "markdown" in idea.body
      ? (idea.body as { markdown?: string }).markdown
      : null;

  return (
    <main className="mx-auto flex min-h-dvh max-w-4xl flex-col gap-8 px-6 py-12">
      <header className="flex items-center justify-between">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 text-sm text-neutral-500">
            <span dir="ltr" className="tabular-nums">
              {idea.code}
            </span>
            <span aria-hidden>·</span>
            <span>{idea.authorName}</span>
            {idea.department ? (
              <>
                <span aria-hidden>·</span>
                <span>{idea.department}</span>
              </>
            ) : null}
          </div>
          <h1 className="text-4xl font-semibold tracking-tight text-neutral-900">
            {title}
          </h1>
          <div className="flex flex-wrap gap-2">
            <Badge tone={stageTone(stage)} dot>
              {t(`stages.${stage}`)}
            </Badge>
            <Badge tone="neutral">
              {t(`innovationType.${idea.innovationType}`)}
            </Badge>
            {idea.framework ? (
              <Badge tone="primary">
                {t(`framework.${idea.framework}`)}
              </Badge>
            ) : null}
          </div>
        </div>
        <LocaleSwitcher />
      </header>

      <Card>
        <CardHeader
          title={t("detail.summary")}
          action={
            canVote ? (
              <VoteButton ideaId={idea.id} count={voteCount} label={t("detail.vote")} />
            ) : (
              <Badge tone="neutral">▲ {voteCount}</Badge>
            )
          }
        />
        <CardBody className="space-y-4">
          {summary ? <p className="text-base text-neutral-700">{summary}</p> : null}
          {bodyMarkdown ? (
            <pre className="whitespace-pre-wrap rounded-md bg-neutral-50 p-4 text-sm text-neutral-800">
              {bodyMarkdown}
            </pre>
          ) : null}
        </CardBody>
      </Card>

      {canGate && forward.length > 0 ? (
        <Card>
          <CardHeader title={t("detail.gateTitle")} subtitle={t("detail.gateSubtitle")} />
          <CardBody>
            <GateDecisionForm
              ideaId={idea.id}
              from={stage}
              forward={forward}
              labels={{
                rationale: t("detail.rationale"),
                approve: t("detail.approve"),
                reject: t("detail.reject"),
                nextStage: t("detail.nextStage"),
                stageNames: {
                  draft: t("stages.draft"),
                  submitted: t("stages.submitted"),
                  triage: t("stages.triage"),
                  evaluation: t("stages.evaluation"),
                  development: t("stages.development"),
                  pilot: t("stages.pilot"),
                  scale: t("stages.scale"),
                  archived: t("stages.archived"),
                  rejected: t("stages.rejected"),
                },
              }}
            />
          </CardBody>
        </Card>
      ) : null}

      <Card>
        <CardHeader title={t("detail.timeline")} />
        <CardBody>
          <ol className="flex flex-col gap-3">
            {events.map((e) => (
              <li
                key={e.id}
                className="flex flex-wrap items-start gap-3 border-s-2 border-primary-200 ps-3"
              >
                <Badge
                  tone={stageTone(e.toStage as Stage)}
                  dot
                  className="shrink-0"
                >
                  {t(`stages.${e.toStage as Stage}`)}
                </Badge>
                <div className="min-w-0 flex-1">
                  <div className="text-sm text-neutral-700">
                    {e.fromStage
                      ? `${t(`stages.${e.fromStage as Stage}`)} → ${t(
                          `stages.${e.toStage as Stage}`,
                        )}`
                      : t(`stages.${e.toStage as Stage}`)}
                  </div>
                  {e.rationale ? (
                    <p className="mt-1 text-sm text-neutral-500">{e.rationale}</p>
                  ) : null}
                  <time
                    dateTime={e.occurredAt.toISOString()}
                    className="text-xs text-neutral-400"
                    dir="ltr"
                  >
                    {e.occurredAt.toISOString().replace("T", " ").slice(0, 16)}
                  </time>
                </div>
              </li>
            ))}
          </ol>
        </CardBody>
      </Card>
    </main>
  );
}
