"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentActor } from "@/lib/auth/current-actor";
import { assertPermission, PermissionDenied } from "@/lib/rbac";
import { audit } from "@/lib/audit/writer";
import { createKey, revokeKey, type Provider } from "@/lib/ai/byok-store";

/**
 * BYOK admin server actions.
 *
 * Each action:
 *   1. Resolves the current actor.
 *   2. Asserts the required permission (deny-by-default).
 *   3. Validates input with Zod.
 *   4. Performs the operation via `lib/ai/byok-store`.
 *   5. Writes an audit event with `outcome=success|failure|denied`.
 *   6. Revalidates the admin route so the list refreshes.
 *
 * Plaintext API keys are received via the FormData payload and dropped from
 * scope as soon as `createKey()` returns. They are never logged.
 */

const createSchema = z.object({
  provider: z.enum(["anthropic", "openai"]),
  label: z.string().min(2).max(120),
  plaintext: z.string().min(8).max(500),
});

const idSchema = z.object({ id: z.string().uuid() });

export interface ActionResult {
  ok: boolean;
  message?: string;
}

export async function createByokKeyAction(
  _: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = createSchema.safeParse({
    provider: formData.get("provider"),
    label: formData.get("label"),
    plaintext: formData.get("plaintext"),
  });
  if (!parsed.success) {
    return { ok: false, message: "Invalid input." };
  }

  const actor = await getCurrentActor();
  try {
    assertPermission(actor, "byok-key:create");
  } catch (err) {
    if (err instanceof PermissionDenied) {
      await audit({
        category: "byok",
        action: "byok.create",
        outcome: "denied",
        actorId: actor.userId,
        actorRoleSlug: actor.roles[0] ?? null,
        details: { required: err.required },
      });
      return { ok: false, message: "Permission denied." };
    }
    throw err;
  }

  try {
    const id = await createKey({
      provider: parsed.data.provider as Provider,
      label: parsed.data.label,
      plaintext: parsed.data.plaintext,
      createdBy: actor.userId,
    });
    await audit({
      category: "byok",
      action: "byok.create",
      outcome: "success",
      actorId: actor.userId,
      actorRoleSlug: actor.roles[0] ?? null,
      target: `byok-key:${id}`,
      details: { provider: parsed.data.provider, label: parsed.data.label },
    });
    revalidatePath("/[locale]/admin/byok", "page");
    return { ok: true, message: "Key stored." };
  } catch (err) {
    await audit({
      category: "byok",
      action: "byok.create",
      outcome: "failure",
      actorId: actor.userId,
      actorRoleSlug: actor.roles[0] ?? null,
      details: { error: err instanceof Error ? err.message : "unknown" },
    });
    return { ok: false, message: "Failed to store key." };
  }
}

export async function revokeByokKeyAction(
  _: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = idSchema.safeParse({ id: formData.get("id") });
  if (!parsed.success) return { ok: false, message: "Invalid id." };

  const actor = await getCurrentActor();
  try {
    assertPermission(actor, "byok-key:revoke");
  } catch (err) {
    if (err instanceof PermissionDenied) {
      await audit({
        category: "byok",
        action: "byok.revoke",
        outcome: "denied",
        actorId: actor.userId,
        actorRoleSlug: actor.roles[0] ?? null,
        target: `byok-key:${parsed.data.id}`,
      });
      return { ok: false, message: "Permission denied." };
    }
    throw err;
  }

  await revokeKey(parsed.data.id);
  await audit({
    category: "byok",
    action: "byok.revoke",
    outcome: "success",
    actorId: actor.userId,
    actorRoleSlug: actor.roles[0] ?? null,
    target: `byok-key:${parsed.data.id}`,
  });
  revalidatePath("/[locale]/admin/byok", "page");
  return { ok: true, message: "Key revoked." };
}
