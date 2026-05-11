import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  jsonb,
  index,
  primaryKey,
} from "drizzle-orm/pg-core";
import { users } from "./users";

/**
 * Idea aggregate — the core entity of Btkr Valley.
 *
 * Lifecycle is modeled as a finite-state machine; each state change is
 * recorded in `lifecycle_events` (see `lifecycle.ts`) and never mutated.
 * The current state denormalizes onto `ideas.stage` for fast dashboard reads.
 *
 * Innovation type drives which stage-gate configuration applies:
 *   - incremental: improvements to existing services
 *   - adjacent:    new offerings in adjacent domains
 *   - disruptive:  fundamentally new value propositions
 *
 * @see docs/togaf/01-business-architecture.md §5 (Value Streams)
 */
export const ideas = pgTable(
  "ideas",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    /** Public short code, e.g. "IDEA-0421" — used in URLs and notifications. */
    code: text("code").notNull().unique(),
    titleAr: text("title_ar").notNull(),
    titleEn: text("title_en"),
    summaryAr: text("summary_ar"),
    summaryEn: text("summary_en"),
    /** Free-form structured body — markdown + optional canvas JSON. */
    body: jsonb("body").$type<{
      markdown?: string;
      canvas?: Record<string, unknown>;
    }>(),
    authorId: uuid("author_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    department: text("department"),
    innovationType: text("innovation_type")
      .notNull()
      .$type<"incremental" | "adjacent" | "disruptive">()
      .default("incremental"),
    /** Current lifecycle stage. Denormalized from the latest event. */
    stage: text("stage")
      .notNull()
      .$type<
        | "draft"
        | "submitted"
        | "triage"
        | "evaluation"
        | "development"
        | "pilot"
        | "scale"
        | "archived"
        | "rejected"
      >()
      .default("draft"),
    /** Framework chosen via the Methodology Wizard. */
    framework: text("framework").$type<
      "triz" | "sit" | "jtbd" | "six-hats" | "design-thinking" | null
    >(),
    /** Soft-delete; hard-deletes are forbidden for audit reasons. */
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("ideas_author_idx").on(t.authorId),
    index("ideas_stage_idx").on(t.stage),
    index("ideas_dept_idx").on(t.department),
  ],
);

/** Votes — one row per (idea, user). Idempotent. */
export const ideaVotes = pgTable(
  "idea_votes",
  {
    ideaId: uuid("idea_id")
      .notNull()
      .references(() => ideas.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    /** -1 or +1. Stored as int for future weighted-voting flexibility. */
    weight: integer("weight").notNull().default(1),
    castAt: timestamp("cast_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.ideaId, t.userId] })],
);

/** Threaded comments on ideas. */
export const ideaComments = pgTable(
  "idea_comments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    ideaId: uuid("idea_id")
      .notNull()
      .references(() => ideas.id, { onDelete: "cascade" }),
    authorId: uuid("author_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    parentId: uuid("parent_id"),
    body: text("body").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    editedAt: timestamp("edited_at", { withTimezone: true }),
  },
  (t) => [index("idea_comments_idea_idx").on(t.ideaId)],
);

export type Idea = typeof ideas.$inferSelect;
export type NewIdea = typeof ideas.$inferInsert;
export type IdeaVote = typeof ideaVotes.$inferSelect;
export type IdeaComment = typeof ideaComments.$inferSelect;
