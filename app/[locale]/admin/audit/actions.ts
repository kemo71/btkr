"use server";

import { revalidatePath } from "next/cache";
import { getCurrentActor } from "@/lib/auth/current-actor";
import { assertPermission, PermissionDenied } from "@/lib/rbac";
import { audit } from "@/lib/audit/writer";
import { listAllAscending } from "@/lib/audit/queries";
import { verifyChain } from "@/lib/audit/chain";

/**
 * Audit-explorer server actions: verify chain integrity, export audit
 * bundle (in-memory JSON for Phase 1; Phase 2 writes to WORM bucket).
 */

export interface VerifyResult {
  ok: boolean;
  total: number;
  brokenAtId: string | null;
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
