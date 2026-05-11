import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireActor } from "@/lib/auth/current-actor";
import { Badge, Card, CardBody, CardHeader } from "@/components/dga";
import { LocaleSwitcher } from "@/components/ui/locale-switcher";
import { leaderboard } from "@/lib/leaderboard/queries";
import {
  levelFor,
  progressTowardNext,
  LEVELS,
  POINTS,
} from "@/lib/leaderboard/scoring";
import type { Locale } from "@/i18n/routing";

export const dynamic = "force-dynamic";

/**
 * Leaderboard — incentivizes participation per TOGAF B §5 V3.
 *
 * Shows the top contributors with their level, total points, and a per-user
 * breakdown of how the points were earned (transparent scoring is part of
 * the AP6 "maintainability over cleverness" principle).
 */
export default async function LeaderboardPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("leaderboard");

  const actor = await requireActor("idea:read");

  const rows = await leaderboard(25);
  const me = rows.find((r) => r.userId === actor.userId);
  const myLevel = me ? levelFor(me.points) : levelFor(0);
  const myProgress = me ? progressTowardNext(me.points) : progressTowardNext(0);
  const localized = (l: (typeof LEVELS)[number]) =>
    locale === "ar" ? l.nameAr : l.nameEn;

  return (
    <main className="mx-auto flex min-h-dvh max-w-5xl flex-col gap-8 px-6 py-12">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-semibold tracking-tight text-neutral-900">
            {t("page.title")}
          </h1>
          <p className="mt-2 text-base text-neutral-600">{t("page.subtitle")}</p>
        </div>
        <LocaleSwitcher />
      </header>

      {me ? (
        <Card>
          <CardHeader title={t("you.title")} subtitle={t("you.subtitle")} />
          <CardBody className="grid gap-4 sm:grid-cols-[1fr_220px]">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-3">
                <Badge tone="primary">
                  {t("you.level", { name: localized(myLevel) })}
                </Badge>
                <span className="text-2xl font-semibold tabular-nums text-neutral-900">
                  {me.points}
                </span>
                <span className="text-sm text-neutral-500">
                  {t("you.points")}
                </span>
              </div>
              {myProgress.next ? (
                <div className="flex flex-col gap-1">
                  <div className="h-2 overflow-hidden rounded-full bg-neutral-100">
                    <div
                      aria-hidden
                      style={{ width: `${Math.round(myProgress.ratio * 100)}%` }}
                      className="h-full rounded-full bg-primary-500 transition-[width] duration-[var(--duration-slow)]"
                    />
                  </div>
                  <span className="text-xs text-neutral-500">
                    {t("you.toNext", {
                      next: localized(myProgress.next),
                      remaining: myProgress.next.threshold - me.points,
                    })}
                  </span>
                </div>
              ) : (
                <span className="text-xs text-neutral-500">
                  {t("you.atTop")}
                </span>
              )}
            </div>
            <ul className="flex flex-col gap-1 text-xs text-neutral-600">
              <li>
                {t("breakdown.ideas")} · {me.ideaCount} × {POINTS.ideaSubmitted}
              </li>
              <li>
                {t("breakdown.scaled")} · {me.scaledCount} × {POINTS.ideaScaled}
              </li>
              <li>
                {t("breakdown.votes")} · {me.voteCount} × {POINTS.voteCast}
              </li>
              <li>
                {t("breakdown.comments")} · {me.commentCount} ×{" "}
                {POINTS.commentPosted}
              </li>
              <li>
                {t("breakdown.accreds")} · {me.accredCount} ×{" "}
                {POINTS.accreditationEarned}
              </li>
              <li>
                {t("breakdown.badges")} · {me.badgeCount} × {POINTS.internalBadge}
              </li>
            </ul>
          </CardBody>
        </Card>
      ) : null}

      <Card>
        <CardHeader
          title={t("top.title")}
          subtitle={t("top.subtitle", { count: rows.length })}
        />
        <CardBody>
          {rows.length === 0 ? (
            <p className="text-sm text-neutral-500">{t("top.empty")}</p>
          ) : (
            <ol className="flex flex-col divide-y divide-neutral-100">
              {rows.map((r, i) => {
                const lvl = levelFor(r.points);
                const isMe = r.userId === actor.userId;
                return (
                  <li
                    key={r.userId}
                    className={
                      isMe
                        ? "flex items-center justify-between gap-3 rounded-md bg-primary-50 px-2 py-2.5"
                        : "flex items-center justify-between gap-3 px-2 py-2.5"
                    }
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="size-8 shrink-0 rounded-full bg-primary-100 text-center text-sm font-semibold leading-8 text-primary-700">
                        {i + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-neutral-900">
                          {r.fullName}
                        </p>
                        <p className="truncate text-xs text-neutral-500">
                          {r.department ?? ""} · {localized(lvl)}
                        </p>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {r.accredCount > 0 ? (
                        <Badge tone="success">
                          {t("badges.accred", { count: r.accredCount })}
                        </Badge>
                      ) : null}
                      {r.badgeCount > 0 ? (
                        <Badge tone="info">
                          {t("badges.internal", { count: r.badgeCount })}
                        </Badge>
                      ) : null}
                      <span className="tabular-nums text-base font-semibold text-neutral-900">
                        {r.points}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader title={t("rules.title")} subtitle={t("rules.subtitle")} />
        <CardBody>
          <ul className="grid gap-2 text-sm sm:grid-cols-2">
            <li>
              <span className="font-medium text-neutral-900">
                {POINTS.ideaSubmitted}
              </span>{" "}
              {t("rules.ideaSubmitted")}
            </li>
            <li>
              <span className="font-medium text-neutral-900">
                {POINTS.ideaPastGate1}
              </span>{" "}
              {t("rules.ideaPastGate1")}
            </li>
            <li>
              <span className="font-medium text-neutral-900">
                {POINTS.ideaScaled}
              </span>{" "}
              {t("rules.ideaScaled")}
            </li>
            <li>
              <span className="font-medium text-neutral-900">
                {POINTS.voteCast}
              </span>{" "}
              {t("rules.voteCast")}
            </li>
            <li>
              <span className="font-medium text-neutral-900">
                {POINTS.commentPosted}
              </span>{" "}
              {t("rules.commentPosted")}
            </li>
            <li>
              <span className="font-medium text-neutral-900">
                {POINTS.accreditationEarned}
              </span>{" "}
              {t("rules.accreditationEarned")}
            </li>
            <li>
              <span className="font-medium text-neutral-900">
                {POINTS.internalBadge}
              </span>{" "}
              {t("rules.internalBadge")}
            </li>
          </ul>
        </CardBody>
      </Card>
    </main>
  );
}
