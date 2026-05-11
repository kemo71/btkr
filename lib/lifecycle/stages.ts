/**
 * Idea lifecycle — stage enum + valid transitions.
 *
 * Each stage maps to a Badge tone for consistent UI treatment, and the
 * `canTransition` predicate enforces the FSM so we never persist an invalid
 * progression. The full audit trail lives in `lifecycle_events`.
 *
 * @see db/schema/ideas.ts (`ideas.stage`)
 * @see db/schema/lifecycle.ts (`lifecycle_events`)
 * @see docs/togaf/01-business-architecture.md §5 (Value Streams)
 */
export const STAGES = [
  "draft",
  "submitted",
  "triage",
  "evaluation",
  "development",
  "pilot",
  "scale",
  "archived",
  "rejected",
] as const;

export type Stage = (typeof STAGES)[number];

/**
 * Allowed forward transitions. `archived` and `rejected` are terminal but
 * reachable from any non-terminal stage.
 */
const FSM: Record<Stage, readonly Stage[]> = {
  draft: ["submitted", "archived"],
  submitted: ["triage", "rejected", "archived"],
  triage: ["evaluation", "rejected", "archived"],
  evaluation: ["development", "rejected", "archived"],
  development: ["pilot", "rejected", "archived"],
  pilot: ["scale", "rejected", "archived"],
  scale: ["archived"],
  archived: [],
  rejected: ["triage"],
};

/**
 * True if `from -> to` is an allowed transition.
 *
 * @example
 * canTransition("submitted", "triage")  // true
 * canTransition("scale", "draft")        // false
 */
export function canTransition(from: Stage, to: Stage): boolean {
  return FSM[from].includes(to);
}

/** Allowed next stages from `from`. */
export function nextStages(from: Stage): readonly Stage[] {
  return FSM[from];
}

/** Badge tone per stage — keeps UI treatment consistent. */
export function stageTone(
  stage: Stage,
): "neutral" | "primary" | "success" | "warning" | "danger" | "info" {
  switch (stage) {
    case "draft":
      return "neutral";
    case "submitted":
    case "triage":
    case "evaluation":
      return "info";
    case "development":
    case "pilot":
      return "warning";
    case "scale":
      return "success";
    case "archived":
      return "neutral";
    case "rejected":
      return "danger";
  }
}
