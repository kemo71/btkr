/**
 * Btkr Valley — gamification point rules.
 *
 * Points are awarded for innovation-positive actions and recorded
 * indirectly via the rows that exist in the DB (no separate `points`
 * table in Phase 1 — that introduces denormalization drift). The
 * leaderboard query in `lib/leaderboard/queries.ts` computes points
 * on read via a few `SUM` expressions.
 *
 * Adjust the weights here; do not scatter scoring rules across the app.
 *
 * @see lib/leaderboard/queries.ts
 * @see docs/togaf/01-business-architecture.md §5 V3 (Recognize -> Retain)
 */
export const POINTS = {
  /** Submitting a new idea — base reward. */
  ideaSubmitted: 10,
  /** Idea advances past Gate 1 (triage -> evaluation). */
  ideaPastGate1: 25,
  /** Idea reaches the Scale stage. */
  ideaScaled: 100,
  /** Casting a vote — small participation reward. */
  voteCast: 1,
  /** Posting a comment. */
  commentPosted: 2,
  /** External accreditation (GInI / NPDP / IDEO U). */
  accreditationEarned: 50,
  /** Internal Btkr badge. */
  internalBadge: 20,
} as const;

export type PointKey = keyof typeof POINTS;

/** Friendly level ladder, derived from total points. */
export interface Level {
  level: number;
  nameAr: string;
  nameEn: string;
  threshold: number;
}

export const LEVELS: readonly Level[] = [
  { level: 1, nameAr: "مستكشف", nameEn: "Explorer", threshold: 0 },
  { level: 2, nameAr: "مبتكر", nameEn: "Innovator", threshold: 50 },
  { level: 3, nameAr: "صانع", nameEn: "Builder", threshold: 200 },
  { level: 4, nameAr: "قائد فكر", nameEn: "Thought Leader", threshold: 500 },
  { level: 5, nameAr: "خبير", nameEn: "Master", threshold: 1000 },
] as const;

/** Level for a point total — highest threshold ≤ points. */
export function levelFor(points: number): Level {
  let chosen = LEVELS[0];
  for (const l of LEVELS) if (points >= l.threshold) chosen = l;
  return chosen;
}

/** Progress (0..1) toward the next level; 1 if already at top. */
export function progressTowardNext(points: number): {
  next: Level | null;
  ratio: number;
} {
  const i = LEVELS.findIndex((l) => points < l.threshold);
  if (i === -1) return { next: null, ratio: 1 };
  const prev = LEVELS[i - 1] ?? LEVELS[0];
  const next = LEVELS[i];
  const span = next.threshold - prev.threshold;
  const within = points - prev.threshold;
  return { next, ratio: Math.max(0, Math.min(1, within / span)) };
}
