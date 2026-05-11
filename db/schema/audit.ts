import {
  pgTable,
  uuid,
  text,
  timestamp,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import { users } from "./users";

/**
 * Audit log — append-only event stream of every sensitive action.
 *
 * This table is the **source of truth** for compliance audits (NCA ECC,
 * internal review). It is NEVER mutated or deleted; PostgreSQL roles enforce
 * `INSERT`-only access for application connections (a separate `audit_admin`
 * role exists for the integrity exporter only).
 *
 * Categories (`category` column):
 *   - "auth"      — login, logout, MFA enrollment, password change
 *   - "rbac"      — role grants/revocations, permission changes
 *   - "byok"      — AI key store / rotate / revoke
 *   - "lifecycle" — gate decisions, archival, framework selection
 *   - "config"    — system settings, branding, locale defaults
 *   - "export"    — audit-export, dashboard export, PDF generation
 *
 * @see docs/security/nca-ecc-mapping.md
 * @see lib/audit — server-side writer that wraps inserts
 */
export const auditLog = pgTable(
  "audit_log",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    /** Actor user id, or NULL for system-initiated events. */
    actorId: uuid("actor_id").references(() => users.id, {
      onDelete: "set null",
    }),
    /** Acting role at time of event, denormalized for forensic readability. */
    actorRoleSlug: text("actor_role_slug"),
    category: text("category")
      .notNull()
      .$type<
        "auth" | "rbac" | "byok" | "lifecycle" | "config" | "export"
      >(),
    /** Free-form action e.g. "byok.rotate", "rbac.grant", "auth.login.failed". */
    action: text("action").notNull(),
    /** Target object reference, e.g. "idea:IDEA-0421", "user:<uuid>". */
    target: text("target"),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    /** Structured details — must not contain plaintext secrets. */
    details: jsonb("details").$type<Record<string, unknown>>(),
    /** Outcome: "success" | "failure" | "denied". */
    outcome: text("outcome")
      .notNull()
      .$type<"success" | "failure" | "denied">(),
    occurredAt: timestamp("occurred_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    /**
     * Hex SHA-256 of the previous row's `entry_hash`, or 64 zeros for the
     * very first row. Forms an append-only Merkle-style chain so any
     * insert / update / delete in the middle is detectable on verify.
     */
    prevHash: text("prev_hash").notNull().default("0".repeat(64)),
    /**
     * Hex SHA-256 of the canonicalized row payload concatenated with
     * `prev_hash`. Computed by `lib/audit/chain.ts` at insert time.
     */
    entryHash: text("entry_hash").notNull().default("0".repeat(64)),
  },
  (t) => [
    index("audit_actor_idx").on(t.actorId),
    index("audit_category_idx").on(t.category),
    index("audit_occurred_idx").on(t.occurredAt),
    index("audit_target_idx").on(t.target),
  ],
);

export type AuditEvent = typeof auditLog.$inferSelect;
export type NewAuditEvent = typeof auditLog.$inferInsert;
