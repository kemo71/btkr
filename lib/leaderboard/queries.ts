import "server-only";
import { desc, eq, sql } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";
import { POINTS } from "./scoring";

/**
 * Leaderboard queries — point totals computed on read.
 *
 * Phase 1 keeps scoring inline (no separate `user_points` table) to avoid
 * denormalization drift. If the leaderboard outgrows a single round trip
 * (~ tens of thousands of users), graduate to a refreshed materialized view.
 *
 * @see lib/leaderboard/scoring.ts
 */

export interface LeaderboardRow {
  userId: string;
  fullName: string;
  department: string | null;
  ideaCount: number;
  scaledCount: number;
  voteCount: number;
  commentCount: number;
  accredCount: number;
  badgeCount: number;
  points: number;
}

export async function leaderboard(limit = 25): Promise<LeaderboardRow[]> {
  // One query per dimension keeps the SQL clear and analyzer-friendly.
  // Postgres handles five small index scans faster than a tangled join + group.
  const ideas = await db
    .select({
      userId: schema.ideas.authorId,
      ideaCount: sql<number>`COUNT(*)::int`,
      scaledCount: sql<number>`COUNT(*) FILTER (WHERE ${schema.ideas.stage} = 'scale')::int`,
    })
    .from(schema.ideas)
    .groupBy(schema.ideas.authorId);

  const votes = await db
    .select({
      userId: schema.ideaVotes.userId,
      voteCount: sql<number>`COUNT(*)::int`,
    })
    .from(schema.ideaVotes)
    .groupBy(schema.ideaVotes.userId);

  const comments = await db
    .select({
      userId: schema.ideaComments.authorId,
      commentCount: sql<number>`COUNT(*)::int`,
    })
    .from(schema.ideaComments)
    .groupBy(schema.ideaComments.authorId);

  const accreds = await db
    .select({
      userId: schema.accreditations.userId,
      accredCount: sql<number>`COUNT(*) FILTER (WHERE ${schema.accreditations.provider} <> 'INTERNAL')::int`,
      badgeCount: sql<number>`COUNT(*) FILTER (WHERE ${schema.accreditations.provider} = 'INTERNAL')::int`,
    })
    .from(schema.accreditations)
    .groupBy(schema.accreditations.userId);

  const users = await db
    .select({
      id: schema.users.id,
      fullName: schema.users.fullName,
      department: schema.users.department,
    })
    .from(schema.users)
    .where(eq(schema.users.isActive, true));

  const ideasMap = new Map(ideas.map((r) => [r.userId, r]));
  const votesMap = new Map(votes.map((r) => [r.userId, r]));
  const commentsMap = new Map(comments.map((r) => [r.userId, r]));
  const accredsMap = new Map(accreds.map((r) => [r.userId, r]));

  const rows: LeaderboardRow[] = users.map((u) => {
    const i = ideasMap.get(u.id);
    const v = votesMap.get(u.id);
    const c = commentsMap.get(u.id);
    const a = accredsMap.get(u.id);
    const ideaCount = Number(i?.ideaCount ?? 0);
    const scaledCount = Number(i?.scaledCount ?? 0);
    const voteCount = Number(v?.voteCount ?? 0);
    const commentCount = Number(c?.commentCount ?? 0);
    const accredCount = Number(a?.accredCount ?? 0);
    const badgeCount = Number(a?.badgeCount ?? 0);
    const points =
      ideaCount * POINTS.ideaSubmitted +
      scaledCount * POINTS.ideaScaled +
      voteCount * POINTS.voteCast +
      commentCount * POINTS.commentPosted +
      accredCount * POINTS.accreditationEarned +
      badgeCount * POINTS.internalBadge;
    return {
      userId: u.id,
      fullName: u.fullName,
      department: u.department,
      ideaCount,
      scaledCount,
      voteCount,
      commentCount,
      accredCount,
      badgeCount,
      points,
    };
  });

  rows.sort((a, b) => b.points - a.points);
  return rows.slice(0, limit);
}

/** Accreditations belonging to a single user (for the profile widget). */
export async function userAccreditations(userId: string) {
  return db
    .select()
    .from(schema.accreditations)
    .where(eq(schema.accreditations.userId, userId))
    .orderBy(desc(schema.accreditations.issuedAt));
}
