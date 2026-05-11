import "server-only";
import { createHash } from "node:crypto";
import type { AuditEvent } from "@/db/schema";

/**
 * Append-only audit hash chain.
 *
 * Every row in `audit_log` carries `prev_hash` and `entry_hash`. The
 * `entry_hash` is `SHA-256(canonical_payload || prev_hash)` where the
 * payload is a stable, key-sorted JSON encoding of the columns that
 * matter for forensic re-construction. Tampering with any row breaks the
 * chain from that row forward — detectable by `verifyChain()`.
 *
 * Phase 1 keeps the hashes in the same DB table for simplicity. Phase 2
 * publishes the latest `entry_hash` to a WORM bucket (immutable storage)
 * on a schedule so that even a full-DB compromise can't rewrite history
 * silently — the checkpoint in WORM proves the prefix is unaltered.
 *
 * @see db/schema/audit.ts
 * @see docs/security/nca-ecc-mapping.md §2-8-3 (Tamper detection)
 */
const GENESIS = "0".repeat(64);

/** Stable string encoding of the parts of an audit row that we hash. */
function canonical(row: {
  id: string;
  actorId: string | null;
  actorRoleSlug: string | null;
  category: string;
  action: string;
  target: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  details: Record<string, unknown> | null;
  outcome: string;
  occurredAt: Date;
}): string {
  const payload: Record<string, unknown> = {
    id: row.id,
    actorId: row.actorId,
    actorRoleSlug: row.actorRoleSlug,
    category: row.category,
    action: row.action,
    target: row.target,
    ipAddress: row.ipAddress,
    userAgent: row.userAgent,
    details: row.details ?? null,
    outcome: row.outcome,
    occurredAt: row.occurredAt.toISOString(),
  };
  // Stable order via Object.keys().sort()
  const keys = Object.keys(payload).sort();
  const ordered: Record<string, unknown> = {};
  for (const k of keys) ordered[k] = payload[k];
  return JSON.stringify(ordered);
}

/** SHA-256 hex digest of `(canonical_payload || prev_hash)`. */
export function entryHashFor(
  row: Parameters<typeof canonical>[0],
  prevHash: string,
): string {
  return createHash("sha256")
    .update(canonical(row), "utf8")
    .update(prevHash, "utf8")
    .digest("hex");
}

export interface ChainVerificationResult {
  ok: boolean;
  brokenAt: { id: string; expected: string; actual: string } | null;
  total: number;
}

/**
 * Verify the chain for a sequence of rows (must be in `occurredAt ASC`
 * order, oldest first).
 *
 * @example
 * const rows = await db.select().from(auditLog).orderBy(asc(...));
 * const r = verifyChain(rows);
 * if (!r.ok) alert("audit tampered at " + r.brokenAt!.id);
 */
export function verifyChain(rows: AuditEvent[]): ChainVerificationResult {
  let prev = GENESIS;
  for (const row of rows) {
    if (row.prevHash !== prev) {
      return {
        ok: false,
        brokenAt: { id: row.id, expected: prev, actual: row.prevHash },
        total: rows.length,
      };
    }
    const expected = entryHashFor(
      {
        id: row.id,
        actorId: row.actorId,
        actorRoleSlug: row.actorRoleSlug,
        category: row.category,
        action: row.action,
        target: row.target,
        ipAddress: row.ipAddress,
        userAgent: row.userAgent,
        details: row.details,
        outcome: row.outcome,
        occurredAt: row.occurredAt,
      },
      prev,
    );
    if (row.entryHash !== expected) {
      return {
        ok: false,
        brokenAt: { id: row.id, expected, actual: row.entryHash },
        total: rows.length,
      };
    }
    prev = row.entryHash;
  }
  return { ok: true, brokenAt: null, total: rows.length };
}

export { GENESIS };
