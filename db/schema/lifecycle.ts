import {
  pgTable,
  uuid,
  text,
  timestamp,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import { users } from "./users";
import { ideas } from "./ideas";

/**
 * Lifecycle events — the *immutable* record of every state transition on an
 * idea. The current state on `ideas.stage` is a cached projection of the
 * latest event here.
 *
 * No row in this table is ever updated or deleted. To reverse a decision,
 * append a new event with the opposite transition. This is what makes the
 * lifecycle auditable per NCA ECC and TOGAF B principle AP5.
 *
 * @see docs/togaf/01-business-architecture.md §8 AP5 (Immutable audit)
 */
export const lifecycleEvents = pgTable(
  "lifecycle_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    ideaId: uuid("idea_id")
      .notNull()
      .references(() => ideas.id, { onDelete: "cascade" }),
    /** Stage *before* this event. Null on the very first event (idea creation). */
    fromStage: text("from_stage"),
    /** Stage *after* this event. */
    toStage: text("to_stage").notNull(),
    /** "transition" | "gate-approval" | "gate-rejection" | "comment-only". */
    eventType: text("event_type")
      .notNull()
      .$type<"transition" | "gate-approval" | "gate-rejection" | "comment-only">(),
    actorId: uuid("actor_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    /** Rationale text — required for gate decisions. */
    rationale: text("rationale"),
    /** Structured decision payload (score breakdown, vote tally, etc). */
    payload: jsonb("payload").$type<Record<string, unknown>>(),
    occurredAt: timestamp("occurred_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("lifecycle_idea_idx").on(t.ideaId),
    index("lifecycle_actor_idx").on(t.actorId),
    index("lifecycle_occurred_idx").on(t.occurredAt),
  ],
);

export type LifecycleEvent = typeof lifecycleEvents.$inferSelect;
export type NewLifecycleEvent = typeof lifecycleEvents.$inferInsert;
