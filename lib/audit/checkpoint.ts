import "server-only";
import { asc, count, desc } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";
import { verifyChain } from "./chain";
import type { AuditCheckpoint, AuditEvent } from "@/db/schema";

/**
 * Audit chain checkpoints.
 *
 * `createCheckpoint` snapshots the current head of the hash chain:
 *   (rowCount N, entryHash H) — "after N audit rows, the chain head was H".
 *
 * `verifyAgainstCheckpoint` proves the prefix up to the latest checkpoint
 * is unaltered: the chain must verify, and the N-th row's `entry_hash` must
 * still equal H. (In production the canonical H lives in a WORM bucket; this
 * table is the local index, and `worm_ref` points at the immutable copy.)
 *
 * @see db/schema/audit.ts (audit_checkpoints)
 * @see lib/audit/chain.ts
 * @see docs/adr/0003-audit-hash-chain.md
 */

export interface CheckpointView {
  id: string;
  rowCount: number;
  entryHash: string;
  createdAt: Date;
  wormRef: string | null;
}

function toView(c: AuditCheckpoint): CheckpointView {
  return {
    id: c.id,
    rowCount: Number(c.rowCount),
    entryHash: c.entryHash,
    createdAt: c.createdAt,
    wormRef: c.wormRef,
  };
}

/** Most recent checkpoint, or null if none has been taken. */
export async function latestCheckpoint(): Promise<CheckpointView | null> {
  const [row] = await db
    .select()
    .from(schema.auditCheckpoints)
    .orderBy(desc(schema.auditCheckpoints.createdAt))
    .limit(1);
  return row ? toView(row) : null;
}

/**
 * Take a new checkpoint at the current chain head.
 *
 * @param actorId — the admin/auditor producing the checkpoint (audit trail).
 * @param wormRef — optional URI/key of the WORM object mirroring it.
 * @returns the new checkpoint, or null if the audit log is empty.
 */
export async function createCheckpoint(
  actorId: string | null,
  wormRef?: string | null,
): Promise<CheckpointView | null> {
  const [{ c }] = await db
    .select({ c: count() })
    .from(schema.auditLog);
  const rowCount = Number(c);
  if (rowCount === 0) return null;

  const [head] = await db
    .select({ entryHash: schema.auditLog.entryHash })
    .from(schema.auditLog)
    .orderBy(desc(schema.auditLog.occurredAt))
    .limit(1);
  if (!head) return null;

  const [inserted] = await db
    .insert(schema.auditCheckpoints)
    .values({
      rowCount: String(rowCount),
      entryHash: head.entryHash,
      createdBy: actorId,
      wormRef: wormRef ?? null,
    })
    .returning();
  return toView(inserted);
}

export interface CheckpointVerification {
  /** True if the chain verifies AND the checkpoint hash still matches. */
  ok: boolean;
  /** Why it failed, if it did. */
  reason:
    | "no-checkpoint"
    | "chain-broken"
    | "row-count-shrank"
    | "hash-mismatch"
    | null;
  /** The checkpoint that was checked against. */
  checkpoint: CheckpointView | null;
  /** Current `audit_log` row count. */
  currentRowCount: number;
  /** First broken audit row id, if the chain itself is broken. */
  brokenAtId: string | null;
}

/**
 * Verify the audit chain against the latest checkpoint.
 *
 * @example
 * const v = await verifyAgainstCheckpoint();
 * if (!v.ok) alert(`Audit integrity FAILED: ${v.reason}`);
 */
export async function verifyAgainstCheckpoint(): Promise<CheckpointVerification> {
  const checkpoint = await latestCheckpoint();
  const rows: AuditEvent[] = await db
    .select()
    .from(schema.auditLog)
    .orderBy(asc(schema.auditLog.occurredAt));
  const currentRowCount = rows.length;

  if (!checkpoint) {
    return {
      ok: false,
      reason: "no-checkpoint",
      checkpoint: null,
      currentRowCount,
      brokenAtId: null,
    };
  }

  const chain = verifyChain(rows);
  if (!chain.ok) {
    return {
      ok: false,
      reason: "chain-broken",
      checkpoint,
      currentRowCount,
      brokenAtId: chain.brokenAt?.id ?? null,
    };
  }

  if (currentRowCount < checkpoint.rowCount) {
    return {
      ok: false,
      reason: "row-count-shrank",
      checkpoint,
      currentRowCount,
      brokenAtId: null,
    };
  }

  // The (1-indexed) N-th row by occurredAt ASC must still carry the
  // checkpointed entry_hash.
  const nth = rows[checkpoint.rowCount - 1];
  if (!nth || nth.entryHash !== checkpoint.entryHash) {
    return {
      ok: false,
      reason: "hash-mismatch",
      checkpoint,
      currentRowCount,
      brokenAtId: nth?.id ?? null,
    };
  }

  return {
    ok: true,
    reason: null,
    checkpoint,
    currentRowCount,
    brokenAtId: null,
  };
}
