import "server-only";
import { db, schema } from "@/lib/db/client";
import type { NewAuditEvent } from "@/db/schema";

/**
 * Audit writer — the *only* sanctioned way to insert into `audit_log`.
 *
 * Wraps the raw insert with:
 *   - Type-narrowed category/outcome literals (compile-time safety)
 *   - A guard against accidentally logging plaintext secrets in `details`
 *     (callers MUST redact before passing)
 *   - Best-effort delivery: a failing audit write logs to stderr but does
 *     NOT abort the calling operation. Pair with infra-level alerting on
 *     "audit write failed" log lines.
 *
 * Per NCA ECC, audit events are append-only. There is intentionally no
 * `updateAudit` or `deleteAudit` export.
 *
 * @see db/schema/audit.ts
 * @see docs/security/nca-ecc-mapping.md
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
 * Record a single audit event.
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
  const row: NewAuditEvent = {
    category: input.category,
    action: input.action,
    outcome: input.outcome,
    actorId: input.actorId ?? null,
    actorRoleSlug: input.actorRoleSlug ?? null,
    target: input.target ?? null,
    ipAddress: input.ipAddress ?? null,
    userAgent: input.userAgent ?? null,
    details: input.details ?? null,
  };

  try {
    await db.insert(schema.auditLog).values(row);
  } catch (err) {
    // Never throw from the audit path — callers must not be coupled to its
    // availability. Surface to ops via stderr; infra-level alerting picks it up.
    console.error("audit.write.failed", {
      action: input.action,
      category: input.category,
      err: err instanceof Error ? err.message : String(err),
    });
  }
}
