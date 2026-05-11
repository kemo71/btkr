import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getCurrentActor } from "@/lib/auth/current-actor";
import { assertPermission, PermissionDenied } from "@/lib/rbac";
import { audit } from "@/lib/audit/writer";
import { streamCoach, type CoachMessage } from "@/lib/ai/coach";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  framework: z
    .enum(["triz", "sit", "jtbd", "six-hats", "design-thinking"])
    .nullable(),
  locale: z.enum(["ar", "en"]),
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().min(1).max(8000),
      }),
    )
    .min(1)
    .max(40),
});

/**
 * POST /api/coach — stream a coach response.
 *
 * RBAC: requires `coach:use`. Audits start (`coach.message.begin`) and
 * end (`coach.message.end`) so the audit log records every coaching turn
 * but never the message contents (privacy).
 *
 * Errors are returned as JSON; success returns a `text/plain` stream.
 */
export async function POST(req: NextRequest): Promise<Response> {
  let actor;
  try {
    actor = await getCurrentActor();
  } catch {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  try {
    assertPermission(actor, "coach:use");
  } catch (err) {
    if (err instanceof PermissionDenied) {
      await audit({
        category: "lifecycle",
        action: "coach.message.begin",
        outcome: "denied",
        actorId: actor.userId,
        actorRoleSlug: actor.roles[0] ?? null,
      });
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    throw err;
  }

  const payload = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  await audit({
    category: "lifecycle",
    action: "coach.message.begin",
    outcome: "success",
    actorId: actor.userId,
    actorRoleSlug: actor.roles[0] ?? null,
    details: {
      framework: parsed.data.framework ?? "general",
      turns: parsed.data.messages.length,
    },
  });

  const messages: CoachMessage[] = parsed.data.messages;
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const chunk of streamCoach({
          framework: parsed.data.framework,
          locale: parsed.data.locale,
          messages,
        })) {
          controller.enqueue(encoder.encode(chunk));
        }
        controller.close();
        await audit({
          category: "lifecycle",
          action: "coach.message.end",
          outcome: "success",
          actorId: actor.userId,
          actorRoleSlug: actor.roles[0] ?? null,
          details: { framework: parsed.data.framework ?? "general" },
        });
      } catch (err) {
        controller.error(err);
        await audit({
          category: "lifecycle",
          action: "coach.message.end",
          outcome: "failure",
          actorId: actor.userId,
          actorRoleSlug: actor.roles[0] ?? null,
          details: {
            error: err instanceof Error ? err.message : "unknown",
          },
        });
      }
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
    },
  });
}
