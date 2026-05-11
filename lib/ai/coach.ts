import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";
import { unseal } from "@/lib/crypto/aes-gcm";
import { getFramework, type FrameworkSlug } from "@/lib/frameworks";

/**
 * AI Innovation Coach.
 *
 * Streams responses from Anthropic, grounded in the chosen framework's
 * step-by-step definition. The active BYOK key is decrypted on entry and
 * lives only in the local closure for the duration of the stream — the
 * plaintext never crosses the function boundary back to the caller.
 *
 * Prompt-caching: the framework system prompt is large and identical
 * across requests for the same framework, so it is marked with
 * `cache_control: ephemeral` to cut latency and cost.
 *
 * Model: `claude-sonnet-4-6` (latest cost-efficient model). Admins can
 * override per provider key via the BYOK label convention (Phase 2).
 *
 * @see lib/ai/byok-store.ts
 * @see lib/frameworks/catalog.ts
 * @see docs/togaf/01-business-architecture.md §4 (Methodology)
 */

const DEFAULT_MODEL = "claude-sonnet-4-6";
const MAX_TOKENS = 1024;

export interface CoachMessage {
  role: "user" | "assistant";
  content: string;
}

function systemPromptFor(
  framework: FrameworkSlug | null,
  locale: "ar" | "en",
): string {
  const isAr = locale === "ar";
  const tone = isAr
    ? "أجب باللغة العربية الفصحى الواضحة. اجعل خطواتك عملية وقصيرة."
    : "Answer in clear, professional English. Keep your steps concrete and short.";

  if (!framework) {
    return [
      isAr
        ? "أنت مدرّب ابتكار لمنصة وادي بتكر التابعة لأكاديمية الملك سلمان العالمية للغة العربية."
        : "You are an innovation coach for Btkr Valley, KSAA's innovation platform.",
      isAr
        ? "أرشد الموظف نحو منهجية الابتكار الأنسب لمشكلته، واطرح أسئلة توضيحية قبل تقديم التوصيات."
        : "Guide the employee toward the most suitable innovation methodology; ask clarifying questions before recommending.",
      tone,
    ].join("\n\n");
  }

  const def = getFramework(framework);
  if (!def) return systemPromptFor(null, locale);

  const name = isAr ? def.nameAr : def.nameEn;
  const oneLiner = isAr ? def.oneLinerAr : def.oneLinerEn;
  const steps = isAr ? def.stepsAr : def.stepsEn;

  return [
    isAr
      ? `أنت مدرّب ابتكار متخصص في منهجية "${name}".`
      : `You are an innovation coach specializing in the "${name}" methodology.`,
    oneLiner,
    isAr ? "خطوات المنهجية:" : "Methodology steps:",
    steps.map((s, i) => `${i + 1}. ${s}`).join("\n"),
    isAr
      ? "اطرح سؤالاً واحداً في كل دور لفهم سياق المستخدم قبل تقديم إرشاد عملي."
      : "Ask one question per turn to understand the user's context before giving concrete guidance.",
    tone,
  ].join("\n\n");
}

/** Decrypt + return the active Anthropic key. Caller owns the lifetime. */
async function loadActiveAnthropicKey(): Promise<string> {
  const [row] = await db
    .select()
    .from(schema.byokKeys)
    .where(
      and(
        eq(schema.byokKeys.provider, "anthropic"),
        eq(schema.byokKeys.isActive, true),
      ),
    )
    .limit(1);
  if (!row) throw new Error("No active Anthropic BYOK key configured.");
  return unseal({
    ciphertext: row.ciphertext,
    iv: row.iv,
    authTag: row.authTag,
  });
}

/**
 * Stream a coach response. Yields plain-text chunks as the model emits
 * them. Caller pipes chunks into a ReadableStream for the HTTP response.
 *
 * @example
 * for await (const chunk of streamCoach({...})) writer.write(enc.encode(chunk));
 */
export async function* streamCoach(args: {
  framework: FrameworkSlug | null;
  locale: "ar" | "en";
  messages: CoachMessage[];
}): AsyncGenerator<string, void, unknown> {
  const apiKey = await loadActiveAnthropicKey();
  const client = new Anthropic({ apiKey });

  const stream = await client.messages.stream({
    model: DEFAULT_MODEL,
    max_tokens: MAX_TOKENS,
    system: [
      {
        type: "text",
        text: systemPromptFor(args.framework, args.locale),
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: args.messages.map((m) => ({ role: m.role, content: m.content })),
  });

  for await (const event of stream) {
    if (
      event.type === "content_block_delta" &&
      event.delta.type === "text_delta"
    ) {
      yield event.delta.text;
    }
  }
}
