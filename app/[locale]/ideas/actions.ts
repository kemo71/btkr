"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getCurrentActor } from "@/lib/auth/current-actor";
import { assertPermission, PermissionDenied } from "@/lib/rbac";
import { audit } from "@/lib/audit/writer";
import {
  createIdea,
  castVote,
  retractVote,
  transitionStage,
  addComment,
} from "@/lib/lifecycle/store";
import { canTransition, type Stage } from "@/lib/lifecycle/stages";

/**
 * Idea-lifecycle server actions.
 *
 * Same pattern as the BYOK actions: resolve actor -> assertPermission ->
 * validate -> persist -> audit -> revalidate.
 *
 * @see app/[locale]/admin/byok/actions.ts (sibling pattern)
 */

export interface ActionResult {
  ok: boolean;
  message?: string;
}

const createSchema = z.object({
  titleAr: z.string().min(3).max(200),
  titleEn: z.string().max(200).optional(),
  summaryAr: z.string().max(1000).optional(),
  body: z.string().max(20_000).optional(),
  department: z.string().max(120).optional(),
  innovationType: z.enum(["incremental", "adjacent", "disruptive"]),
  framework: z
    .enum(["triz", "sit", "jtbd", "six-hats", "design-thinking"])
    .optional(),
});

export async function createIdeaAction(
  _: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const actor = await getCurrentActor();
  try {
    assertPermission(actor, "idea:create");
  } catch (err) {
    if (err instanceof PermissionDenied) {
      await audit({
        category: "lifecycle",
        action: "idea.create",
        outcome: "denied",
        actorId: actor.userId,
        actorRoleSlug: actor.roles[0] ?? null,
      });
      return { ok: false, message: "Permission denied." };
    }
    throw err;
  }

  const parsed = createSchema.safeParse({
    titleAr: formData.get("titleAr"),
    titleEn: formData.get("titleEn") || undefined,
    summaryAr: formData.get("summaryAr") || undefined,
    body: formData.get("body") || undefined,
    department: formData.get("department") || undefined,
    innovationType: formData.get("innovationType"),
    framework: formData.get("framework") || undefined,
  });
  if (!parsed.success) {
    return { ok: false, message: "Invalid input." };
  }

  const result = await createIdea({
    authorId: actor.userId,
    titleAr: parsed.data.titleAr,
    titleEn: parsed.data.titleEn ?? null,
    summaryAr: parsed.data.summaryAr ?? null,
    body: parsed.data.body,
    department: parsed.data.department ?? null,
    innovationType: parsed.data.innovationType,
    framework: parsed.data.framework ?? null,
  });

  await audit({
    category: "lifecycle",
    action: "idea.create",
    outcome: "success",
    actorId: actor.userId,
    actorRoleSlug: actor.roles[0] ?? null,
    target: `idea:${result.code}`,
    details: { innovationType: parsed.data.innovationType },
  });

  revalidatePath("/[locale]/ideas", "page");
  redirect(`./${result.code}`);
}

const voteSchema = z.object({
  ideaId: z.string().uuid(),
  action: z.enum(["up", "down"]),
});

export async function voteIdeaAction(
  _: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = voteSchema.safeParse({
    ideaId: formData.get("ideaId"),
    action: formData.get("action"),
  });
  if (!parsed.success) return { ok: false, message: "Invalid input." };

  const actor = await getCurrentActor();
  try {
    assertPermission(actor, "idea:vote");
  } catch (err) {
    if (err instanceof PermissionDenied) {
      return { ok: false, message: "Permission denied." };
    }
    throw err;
  }

  if (parsed.data.action === "up") {
    await castVote({ ideaId: parsed.data.ideaId, userId: actor.userId });
  } else {
    await retractVote({ ideaId: parsed.data.ideaId, userId: actor.userId });
  }
  revalidatePath("/[locale]/ideas/[code]", "page");
  return { ok: true };
}

const commentSchema = z.object({
  ideaId: z.string().uuid(),
  body: z.string().min(1).max(4000),
});

export async function commentOnIdeaAction(
  _: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = commentSchema.safeParse({
    ideaId: formData.get("ideaId"),
    body: formData.get("body"),
  });
  if (!parsed.success) return { ok: false, message: "Invalid input." };

  const actor = await getCurrentActor();
  try {
    assertPermission(actor, "idea:comment");
  } catch (err) {
    if (err instanceof PermissionDenied) {
      return { ok: false, message: "Permission denied." };
    }
    throw err;
  }

  const id = await addComment({
    ideaId: parsed.data.ideaId,
    authorId: actor.userId,
    body: parsed.data.body,
  });
  await audit({
    category: "lifecycle",
    action: "idea.comment",
    outcome: "success",
    actorId: actor.userId,
    actorRoleSlug: actor.roles[0] ?? null,
    target: `idea:${parsed.data.ideaId}`,
    details: { commentId: id },
  });
  revalidatePath("/[locale]/ideas/[code]", "page");
  return { ok: true };
}

const transitionSchema = z.object({
  ideaId: z.string().uuid(),
  from: z.string(),
  to: z.string(),
  rationale: z.string().min(3).max(2000),
  decision: z.enum(["approve", "reject"]),
});

export async function transitionStageAction(
  _: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = transitionSchema.safeParse({
    ideaId: formData.get("ideaId"),
    from: formData.get("from"),
    to: formData.get("to"),
    rationale: formData.get("rationale"),
    decision: formData.get("decision"),
  });
  if (!parsed.success) return { ok: false, message: "Invalid input." };

  const actor = await getCurrentActor();
  const required = parsed.data.decision === "approve" ? "gate:approve" : "gate:reject";

  try {
    assertPermission(actor, required);
  } catch (err) {
    if (err instanceof PermissionDenied) {
      await audit({
        category: "lifecycle",
        action: "gate.decision",
        outcome: "denied",
        actorId: actor.userId,
        actorRoleSlug: actor.roles[0] ?? null,
        target: `idea:${parsed.data.ideaId}`,
        details: { from: parsed.data.from, to: parsed.data.to },
      });
      return { ok: false, message: "Permission denied." };
    }
    throw err;
  }

  if (!canTransition(parsed.data.from as Stage, parsed.data.to as Stage)) {
    return { ok: false, message: "Illegal transition." };
  }

  await transitionStage({
    ideaId: parsed.data.ideaId,
    from: parsed.data.from as Stage,
    to: parsed.data.to as Stage,
    actorId: actor.userId,
    rationale: parsed.data.rationale,
    eventType:
      parsed.data.decision === "approve" ? "gate-approval" : "gate-rejection",
  });

  await audit({
    category: "lifecycle",
    action: "gate.decision",
    outcome: "success",
    actorId: actor.userId,
    actorRoleSlug: actor.roles[0] ?? null,
    target: `idea:${parsed.data.ideaId}`,
    details: {
      from: parsed.data.from,
      to: parsed.data.to,
      decision: parsed.data.decision,
    },
  });

  revalidatePath("/[locale]/ideas/[code]", "page");
  return { ok: true };
}
