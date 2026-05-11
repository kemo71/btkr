import "server-only";
import { eq, desc, sql, count } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";
import type { Idea, NewIdea, LifecycleEvent } from "@/db/schema";
import { canTransition, type Stage } from "./stages";

/**
 * Idea + lifecycle persistence helpers.
 *
 * All writes that change `ideas.stage` MUST go through `transitionStage()`
 * so the corresponding row in `lifecycle_events` is appended atomically.
 * Direct updates to `ideas.stage` are forbidden by convention; future Phase
 * 2 work pushes this into a Postgres trigger.
 *
 * @see lib/lifecycle/stages.ts (FSM)
 */

/** Public, locale-aware projection of an idea row for list views. */
export interface IdeaListItem {
  id: string;
  code: string;
  titleAr: string;
  titleEn: string | null;
  authorId: string;
  authorName: string;
  department: string | null;
  innovationType: "incremental" | "adjacent" | "disruptive";
  stage: Stage;
  framework: Idea["framework"];
  voteCount: number;
  createdAt: Date;
}

export async function listIdeas(): Promise<IdeaListItem[]> {
  const rows = await db
    .select({
      id: schema.ideas.id,
      code: schema.ideas.code,
      titleAr: schema.ideas.titleAr,
      titleEn: schema.ideas.titleEn,
      authorId: schema.ideas.authorId,
      authorName: schema.users.fullName,
      department: schema.ideas.department,
      innovationType: schema.ideas.innovationType,
      stage: schema.ideas.stage,
      framework: schema.ideas.framework,
      voteCount: sql<number>`coalesce(${count(schema.ideaVotes.userId)}, 0)`,
      createdAt: schema.ideas.createdAt,
    })
    .from(schema.ideas)
    .innerJoin(schema.users, eq(schema.users.id, schema.ideas.authorId))
    .leftJoin(schema.ideaVotes, eq(schema.ideaVotes.ideaId, schema.ideas.id))
    .groupBy(schema.ideas.id, schema.users.fullName)
    .orderBy(desc(schema.ideas.createdAt));

  return rows.map((r) => ({
    ...r,
    stage: r.stage as Stage,
    voteCount: Number(r.voteCount),
  }));
}

export async function getIdeaByCode(code: string): Promise<{
  idea: Idea & { authorName: string };
  events: LifecycleEvent[];
  voteCount: number;
} | null> {
  const [row] = await db
    .select({
      idea: schema.ideas,
      authorName: schema.users.fullName,
    })
    .from(schema.ideas)
    .innerJoin(schema.users, eq(schema.users.id, schema.ideas.authorId))
    .where(eq(schema.ideas.code, code));
  if (!row) return null;

  const events = await db
    .select()
    .from(schema.lifecycleEvents)
    .where(eq(schema.lifecycleEvents.ideaId, row.idea.id))
    .orderBy(desc(schema.lifecycleEvents.occurredAt));

  const [vc] = await db
    .select({ c: count() })
    .from(schema.ideaVotes)
    .where(eq(schema.ideaVotes.ideaId, row.idea.id));

  return {
    idea: { ...row.idea, authorName: row.authorName },
    events,
    voteCount: Number(vc?.c ?? 0),
  };
}

export async function createIdea(input: {
  authorId: string;
  titleAr: string;
  titleEn?: string | null;
  summaryAr?: string | null;
  body?: string;
  department?: string | null;
  innovationType: "incremental" | "adjacent" | "disruptive";
  framework?: Idea["framework"];
}): Promise<{ id: string; code: string }> {
  return db.transaction(async (tx) => {
    // Generate a human-friendly short code by counting current rows.
    const [{ c }] = await tx.select({ c: count() }).from(schema.ideas);
    const code = `IDEA-${String(Number(c) + 1).padStart(4, "0")}`;

    const row: NewIdea = {
      code,
      titleAr: input.titleAr,
      titleEn: input.titleEn ?? null,
      summaryAr: input.summaryAr ?? null,
      body: input.body ? { markdown: input.body } : null,
      authorId: input.authorId,
      department: input.department ?? null,
      innovationType: input.innovationType,
      framework: input.framework ?? null,
      stage: "submitted",
    };

    const [inserted] = await tx
      .insert(schema.ideas)
      .values(row)
      .returning({ id: schema.ideas.id });

    await tx.insert(schema.lifecycleEvents).values({
      ideaId: inserted.id,
      fromStage: null,
      toStage: "submitted",
      eventType: "transition",
      actorId: input.authorId,
      rationale: null,
    });

    return { id: inserted.id, code };
  });
}

export async function transitionStage(input: {
  ideaId: string;
  from: Stage;
  to: Stage;
  actorId: string;
  rationale: string | null;
  eventType: "transition" | "gate-approval" | "gate-rejection";
}): Promise<void> {
  if (!canTransition(input.from, input.to)) {
    throw new Error(`Illegal transition ${input.from} -> ${input.to}`);
  }

  await db.transaction(async (tx) => {
    // Optimistic concurrency: only update if stage is still `from`.
    const result = await tx
      .update(schema.ideas)
      .set({ stage: input.to, updatedAt: new Date() })
      .where(
        sql`${schema.ideas.id} = ${input.ideaId} AND ${schema.ideas.stage} = ${input.from}`,
      );
    // postgres-js returns a result with `count`; if 0, somebody else moved it.
    if ((result as unknown as { count: number }).count === 0) {
      throw new Error("Stage changed concurrently; refresh and retry.");
    }

    await tx.insert(schema.lifecycleEvents).values({
      ideaId: input.ideaId,
      fromStage: input.from,
      toStage: input.to,
      eventType: input.eventType,
      actorId: input.actorId,
      rationale: input.rationale,
    });
  });
}

export async function castVote(input: {
  ideaId: string;
  userId: string;
}): Promise<void> {
  await db
    .insert(schema.ideaVotes)
    .values({ ideaId: input.ideaId, userId: input.userId, weight: 1 })
    .onConflictDoNothing();
}

export async function retractVote(input: {
  ideaId: string;
  userId: string;
}): Promise<void> {
  await db
    .delete(schema.ideaVotes)
    .where(
      sql`${schema.ideaVotes.ideaId} = ${input.ideaId} AND ${schema.ideaVotes.userId} = ${input.userId}`,
    );
}

export async function hasVoted(input: {
  ideaId: string;
  userId: string;
}): Promise<boolean> {
  const [row] = await db
    .select({ ideaId: schema.ideaVotes.ideaId })
    .from(schema.ideaVotes)
    .where(
      sql`${schema.ideaVotes.ideaId} = ${input.ideaId} AND ${schema.ideaVotes.userId} = ${input.userId}`,
    )
    .limit(1);
  return Boolean(row);
}

/** A comment row joined with its author's display name, for rendering. */
export interface CommentView {
  id: string;
  ideaId: string;
  authorId: string;
  authorName: string;
  parentId: string | null;
  body: string;
  createdAt: Date;
  editedAt: Date | null;
}

/** List an idea's comments, oldest first. Phase 1 renders them flat. */
export async function listComments(ideaId: string): Promise<CommentView[]> {
  const rows = await db
    .select({
      id: schema.ideaComments.id,
      ideaId: schema.ideaComments.ideaId,
      authorId: schema.ideaComments.authorId,
      authorName: schema.users.fullName,
      parentId: schema.ideaComments.parentId,
      body: schema.ideaComments.body,
      createdAt: schema.ideaComments.createdAt,
      editedAt: schema.ideaComments.editedAt,
    })
    .from(schema.ideaComments)
    .innerJoin(schema.users, eq(schema.users.id, schema.ideaComments.authorId))
    .where(eq(schema.ideaComments.ideaId, ideaId))
    .orderBy(schema.ideaComments.createdAt);
  return rows;
}

/** Append a comment. `parentId` is accepted for future threading. */
export async function addComment(input: {
  ideaId: string;
  authorId: string;
  body: string;
  parentId?: string | null;
}): Promise<string> {
  const [inserted] = await db
    .insert(schema.ideaComments)
    .values({
      ideaId: input.ideaId,
      authorId: input.authorId,
      body: input.body,
      parentId: input.parentId ?? null,
    })
    .returning({ id: schema.ideaComments.id });
  return inserted.id;
}

/** Resolve an idea's UUID + public code from its code (for actions). */
export async function ideaIdForCode(
  code: string,
): Promise<{ id: string; code: string } | null> {
  const [row] = await db
    .select({ id: schema.ideas.id, code: schema.ideas.code })
    .from(schema.ideas)
    .where(eq(schema.ideas.code, code))
    .limit(1);
  return row ?? null;
}
