import "server-only";
import { and, desc, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";
import { seal, unseal } from "@/lib/crypto/aes-gcm";
import type { ByokKey, NewByokKey } from "@/db/schema";

/**
 * BYOK key store — encapsulates the only sanctioned reads/writes against
 * `byok_keys`. All callers go through this module so encryption invariants
 * are enforced in one place.
 *
 * Plaintext API keys never leave this module except via the `withActiveKey`
 * helper, which decrypts within a callback scope and drops the reference
 * immediately after.
 *
 * @see lib/crypto/aes-gcm.ts (sealing)
 * @see db/schema/byok.ts
 */
export type Provider = "anthropic" | "openai";

export interface ByokRowView {
  id: string;
  provider: Provider;
  label: string;
  isActive: boolean;
  createdAt: Date;
  rotatedAt: Date | null;
  revokedAt: Date | null;
  /** Last 4 characters of the *encrypted* ciphertext — purely cosmetic. */
  ciphertextSuffix: string;
}

function toView(row: ByokKey): ByokRowView {
  return {
    id: row.id,
    provider: row.provider,
    label: row.label,
    isActive: row.isActive,
    createdAt: row.createdAt,
    rotatedAt: row.rotatedAt,
    revokedAt: row.revokedAt,
    ciphertextSuffix: row.ciphertext.slice(-4),
  };
}

/** List BYOK keys for the admin UI. Plaintext is never returned. */
export async function listKeys(): Promise<ByokRowView[]> {
  const rows = await db
    .select()
    .from(schema.byokKeys)
    .orderBy(desc(schema.byokKeys.createdAt));
  return rows.map(toView);
}

/**
 * Persist a new key for `provider`. Marks any previously active key for the
 * same provider as inactive (rotation in one step).
 *
 * @returns the new row's id.
 */
export async function createKey(input: {
  provider: Provider;
  label: string;
  plaintext: string;
  createdBy: string;
}): Promise<string> {
  if (input.plaintext.length < 8) {
    throw new Error("API key too short to be valid.");
  }
  const sealed = await seal(input.plaintext);
  const kekRef = "BYOK_KEK";

  return await db.transaction(async (tx) => {
    // Demote any existing active key for this provider.
    await tx
      .update(schema.byokKeys)
      .set({ isActive: false, rotatedAt: new Date() })
      .where(
        and(
          eq(schema.byokKeys.provider, input.provider),
          eq(schema.byokKeys.isActive, true),
        ),
      );

    const row: NewByokKey = {
      provider: input.provider,
      label: input.label,
      ciphertext: sealed.ciphertext,
      iv: sealed.iv,
      authTag: sealed.authTag,
      kekRef,
      isActive: true,
      createdBy: input.createdBy,
    };

    const [inserted] = await tx
      .insert(schema.byokKeys)
      .values(row)
      .returning({ id: schema.byokKeys.id });

    return inserted.id;
  });
}

/**
 * Mark a key as revoked. The row stays for audit retention, but it cannot
 * be returned by `getActivePlaintext` afterwards.
 */
export async function revokeKey(id: string): Promise<void> {
  await db
    .update(schema.byokKeys)
    .set({ isActive: false, revokedAt: new Date() })
    .where(eq(schema.byokKeys.id, id));
}

/**
 * Decrypt the active key for `provider` and pass it into the callback. The
 * plaintext is never returned to the caller directly — callers must perform
 * their work inside the callback so the reference is dropped on return.
 *
 * @example
 * await withActivePlaintext("anthropic", async (key) => {
 *   const client = new Anthropic({ apiKey: key });
 *   return client.messages.create({...});
 * });
 *
 * @throws if no active key exists for the provider.
 */
export async function withActivePlaintext<T>(
  provider: Provider,
  fn: (plaintext: string) => Promise<T>,
): Promise<T> {
  const [row] = await db
    .select()
    .from(schema.byokKeys)
    .where(
      and(
        eq(schema.byokKeys.provider, provider),
        eq(schema.byokKeys.isActive, true),
      ),
    )
    .limit(1);
  if (!row) {
    throw new Error(`No active BYOK key configured for ${provider}.`);
  }
  const plaintext = await unseal({
    ciphertext: row.ciphertext,
    iv: row.iv,
    authTag: row.authTag,
  });
  return fn(plaintext);
}
