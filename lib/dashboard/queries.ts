import "server-only";
import { desc, eq, sql, count } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";
import type { Stage } from "@/lib/lifecycle/stages";
import type { FrameworkSlug } from "@/lib/frameworks";

/**
 * Strategic Dashboard queries.
 *
 * Lightweight aggregates against the live tables. Phase 2 introduces a
 * materialized view + scheduled refresh once the dataset outgrows a single
 * request budget; until then we read from the source of truth so the
 * dashboard never lies.
 *
 * @see app/[locale]/dashboard/page.tsx
 * @see docs/togaf/01-business-architecture.md §9 (KPIs)
 */

/** Idea count per stage. Stages with zero are omitted by the SQL group-by;
 *  the caller is expected to densify with the full stage list. */
export async function funnelByStage(): Promise<{ stage: Stage; count: number }[]> {
  const rows = await db
    .select({
      stage: schema.ideas.stage,
      count: count(),
    })
    .from(schema.ideas)
    .groupBy(schema.ideas.stage);
  return rows.map((r) => ({ stage: r.stage as Stage, count: Number(r.count) }));
}

/** Top contributors by submitted-idea count. */
export async function topContributors(
  limit = 5,
): Promise<{ userId: string; fullName: string; department: string | null; ideas: number }[]> {
  const rows = await db
    .select({
      userId: schema.users.id,
      fullName: schema.users.fullName,
      department: schema.users.department,
      ideas: count(schema.ideas.id),
    })
    .from(schema.users)
    .innerJoin(schema.ideas, eq(schema.ideas.authorId, schema.users.id))
    .groupBy(schema.users.id, schema.users.fullName, schema.users.department)
    .orderBy(desc(count(schema.ideas.id)))
    .limit(limit);
  return rows.map((r) => ({ ...r, ideas: Number(r.ideas) }));
}

/** Methodology adoption: idea count per framework. */
export async function methodologyAdoption(): Promise<
  { framework: FrameworkSlug | "none"; count: number }[]
> {
  const rows = await db
    .select({
      framework: schema.ideas.framework,
      count: count(),
    })
    .from(schema.ideas)
    .groupBy(schema.ideas.framework);
  return rows.map((r) => ({
    framework: (r.framework ?? "none") as FrameworkSlug | "none",
    count: Number(r.count),
  }));
}

/** Most recent gate decisions (approvals + rejections). */
export async function recentGateDecisions(limit = 8): Promise<
  {
    id: string;
    ideaCode: string;
    ideaTitle: string;
    actorName: string;
    fromStage: Stage | null;
    toStage: Stage;
    eventType: "gate-approval" | "gate-rejection";
    rationale: string | null;
    occurredAt: Date;
  }[]
> {
  const rows = await db
    .select({
      id: schema.lifecycleEvents.id,
      ideaCode: schema.ideas.code,
      ideaTitle: schema.ideas.titleAr,
      actorName: schema.users.fullName,
      fromStage: schema.lifecycleEvents.fromStage,
      toStage: schema.lifecycleEvents.toStage,
      eventType: schema.lifecycleEvents.eventType,
      rationale: schema.lifecycleEvents.rationale,
      occurredAt: schema.lifecycleEvents.occurredAt,
    })
    .from(schema.lifecycleEvents)
    .innerJoin(schema.ideas, eq(schema.ideas.id, schema.lifecycleEvents.ideaId))
    .innerJoin(schema.users, eq(schema.users.id, schema.lifecycleEvents.actorId))
    .where(
      sql`${schema.lifecycleEvents.eventType} IN ('gate-approval', 'gate-rejection')`,
    )
    .orderBy(desc(schema.lifecycleEvents.occurredAt))
    .limit(limit);

  return rows.map((r) => ({
    ...r,
    fromStage: r.fromStage as Stage | null,
    toStage: r.toStage as Stage,
    eventType: r.eventType as "gate-approval" | "gate-rejection",
  }));
}

/** Headline KPIs for the dashboard hero row. */
export async function headlineKpis(): Promise<{
  totalIdeas: number;
  activeIdeas: number;
  approvalRate: number;
  totalUsers: number;
}> {
  const [{ c: total }] = await db
    .select({ c: count() })
    .from(schema.ideas);

  const [{ c: active }] = await db
    .select({ c: count() })
    .from(schema.ideas)
    .where(sql`${schema.ideas.stage} NOT IN ('archived', 'rejected', 'draft')`);

  const [{ c: approvals }] = await db
    .select({ c: count() })
    .from(schema.lifecycleEvents)
    .where(eq(schema.lifecycleEvents.eventType, "gate-approval"));

  const [{ c: rejections }] = await db
    .select({ c: count() })
    .from(schema.lifecycleEvents)
    .where(eq(schema.lifecycleEvents.eventType, "gate-rejection"));

  const [{ c: users }] = await db.select({ c: count() }).from(schema.users);

  const decisions = Number(approvals) + Number(rejections);
  const approvalRate = decisions === 0 ? 0 : Number(approvals) / decisions;

  return {
    totalIdeas: Number(total),
    activeIdeas: Number(active),
    approvalRate,
    totalUsers: Number(users),
  };
}
