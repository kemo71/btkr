"use server";

import { revalidatePath } from "next/cache";
import { getCurrentActor } from "@/lib/auth/current-actor";
import { assertPermission, PermissionDenied } from "@/lib/rbac";
import { audit } from "@/lib/audit/writer";
import { listAllAscending } from "@/lib/audit/queries";
import { verifyChain } from "@/lib/audit/chain";
import {
  createCheckpoint,
  verifyAgainstCheckpoint,
} from "@/lib/audit/checkpoint";

/**
 * Audit-explorer server actions: verify the hash chain, take a chain
 * checkpoint, and verify the chain against the latest checkpoint.
 */

export interface VerifyResult {
  ok: boolean;
  total: number;
  brokenAtId: string | null;
}

export interface CheckpointActionResult {
  ok: boolean;
  message?: string;
  rowCount?: number;
}

export async function verifyChainAction(): Promise<VerifyResult> {
  const actor = await getCurrentActor();
  try {
    assertPermission(actor, "audit:read");
  } catch (err) {
    if (err instanceof PermissionDenied) {
      await audit({
        category: "export",
        action: "audit.verify",
        outcome: "denied",
        actorId: actor.userId,
        actorRoleSlug: actor.roles[0] ?? null,
      });
      return { ok: false, total: 0, brokenAtId: null };
    }
    throw err;
  }

  const rows = await listAllAscending();
  const result = verifyChain(rows);

  await audit({
    category: "export",
    action: "audit.verify",
    outcome: result.ok ? "success" : "failure",
    actorId: actor.userId,
    actorRoleSlug: actor.roles[0] ?? null,
    details: {
      total: result.total,
      brokenAtId: result.brokenAt?.id ?? null,
    },
  });

  revalidatePath("/[locale]/admin/audit", "page");
  return {
    ok: result.ok,
    total: result.total,
    brokenAtId: result.brokenAt?.id ?? null,
  };
}

/** Take a new chain checkpoint at the current head. */
export async function createCheckpointAction(): Promise<CheckpointActionResult> {
  const actor = await getCurrentActor();
  try {
    assertPermission(actor, "audit:export");
  } catch (err) {
    if (err instanceof PermissionDenied) {
      await audit({
        category: "export",
        action: "audit.checkpoint.create",
        outcome: "denied",
        actorId: actor.userId,
        actorRoleSlug: actor.roles[0] ?? null,
      });
      return { ok: false, message: "Permission denied." };
    }
    throw err;
  }

  const cp = await createCheckpoint(actor.userId);
  await audit({
    category: "export",
    action: "audit.checkpoint.create",
    outcome: cp ? "success" : "failure",
    actorId: actor.userId,
    actorRoleSlug: actor.roles[0] ?? null,
    details: { rowCount: cp?.rowCount ?? 0, entryHash: cp?.entryHash ?? null },
  });
  revalidatePath("/[locale]/admin/audit", "page");
  return cp
    ? { ok: true, message: "Checkpoint taken.", rowCount: cp.rowCount }
    : { ok: false, message: "Audit log is empty." };
}

/** Verify the chain against the latest checkpoint. */
export async function verifyCheckpointAction(): Promise<{
  ok: boolean;
  reason: string | null;
  rowCount: number;
}> {
  const actor = await getCurrentActor();
  try {
    assertPermission(actor, "audit:read");
  } catch (err) {
    if (err instanceof PermissionDenied) {
      await audit({
        category: "export",
        action: "audit.checkpoint.verify",
        outcome: "denied",
        actorId: actor.userId,
        actorRoleSlug: actor.roles[0] ?? null,
      });
      return { ok: false, reason: "denied", rowCount: 0 };
    }
    throw err;
  }

  const v = await verifyAgainstCheckpoint();
  await audit({
    category: "export",
    action: "audit.checkpoint.verify",
    outcome: v.ok ? "success" : "failure",
    actorId: actor.userId,
    actorRoleSlug: actor.roles[0] ?? null,
    details: {
      reason: v.reason,
      checkpointRowCount: v.checkpoint?.rowCount ?? null,
      currentRowCount: v.currentRowCount,
      brokenAtId: v.brokenAtId,
    },
  });
  revalidatePath("/[locale]/admin/audit", "page");
  return { ok: v.ok, reason: v.reason, rowCount: v.currentRowCount };
}
