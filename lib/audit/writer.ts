import "server-only";
import { desc, sql } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";
import type { NewAuditEvent } from "@/db/schema";
import { entryHashFor, GENESIS } from "./chain";

/**
 * Audit writer — the only sanctioned way to insert into `audit_log`.
 *
 * Phase 2 enhancement: every insert is wrapped in a transaction that locks
 * the audit table (`SHARE ROW EXCLUSIVE` mode), reads the latest
 * `entry_hash`, computes the new row's `entry_hash`, and inserts in one
 * atomic step. This forms the append-only hash chain verified by
 * `lib/audit/chain.ts`.
 *
 * Why a table lock: the entry_hash depends on the *previous* row, so two
 * concurrent inserts would race. The lock is held for the duration of
 * a single statement, so contention impact is bounded.
 *
 * Best-effort delivery: a failing audit write logs to stderr but does NOT
 * abort the calling operation. Pair with infra-level alerting on
 * "audit.write.failed" log lines.
 *
 * @see db/schema/audit.ts
 * @see lib/audit/chain.ts
 * @see docs/security/nca-ecc-mapping.md §2-8
 */
export type AuditCategory =
  | "auth"
  | "rbac"
  | "byok"
  | "lifecycle"
  | "config"
  | "export";

export type AuditOutcome = "success" | "failure" | "denied";

export interface AuditInput {
  category: AuditCategory;
  action: string;
  outcome: AuditOutcome;
  actorId?: string | null;
  actorRoleSlug?: string | null;
  target?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  details?: Record<string, unknown> | null;
}

/**
 * Record a single audit event, extending the hash chain.
 *
 * @example
 * await audit({
 *   category: "byok",
 *   action: "byok.rotate",
 *   outcome: "success",
 *   actorId: actor.userId,
 *   actorRoleSlug: actor.roles[0],
 *   target: "byok-key:anthropic",
 *   details: { previousKeyId, newKeyId },
 * });
 */
export async function audit(input: AuditInput): Promise<void> {
  try {
    await db.transaction(async (tx) => {
      // Lock the audit table for the duration of this statement so the
      // (read latest, compute hash, insert) sequence is race-free.
      await tx.execute(
        sql`LOCK TABLE ${schema.auditLog} IN SHARE ROW EXCLUSIVE MODE`,
      );

      const [latest] = await tx
        .select({ entryHash: schema.auditLog.entryHash })
        .from(schema.auditLog)
        .orderBy(desc(schema.auditLog.occurredAt))
        .limit(1);
      const prevHash = latest?.entryHash ?? GENESIS;

      // Reserve the id + timestamp now so the hash uses the same values
      // we'll persist.
      const occurredAt = new Date();
      const id = crypto.randomUUID();

      const entryHash = entryHashFor(
        {
          id,
          actorId: input.actorId ?? null,
          actorRoleSlug: input.actorRoleSlug ?? null,
          category: input.category,
          action: input.action,
          target: input.target ?? null,
          ipAddress: input.ipAddress ?? null,
          userAgent: input.userAgent ?? null,
          details: input.details ?? null,
          outcome: input.outcome,
          occurredAt,
        },
        prevHash,
      );

      const row: NewAuditEvent = {
        id,
        category: input.category,
        action: input.action,
        outcome: input.outcome,
        actorId: input.actorId ?? null,
        actorRoleSlug: input.actorRoleSlug ?? null,
        target: input.target ?? null,
        ipAddress: input.ipAddress ?? null,
        userAgent: input.userAgent ?? null,
        details: input.details ?? null,
        occurredAt,
        prevHash,
        entryHash,
      };

      await tx.insert(schema.auditLog).values(row);
    });
  } catch (err) {
    console.error("audit.write.failed", {
      action: input.action,
      category: input.category,
      err: err instanceof Error ? err.message : String(err),
    });
  }
}
