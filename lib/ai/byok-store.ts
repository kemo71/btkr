import "server-only";
import { and, desc, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";
import { seal, unseal } from "@/lib/crypto/aes-gcm";
import type { ByokKey, NewByokKey } from "@/db/schema";

/**
 * BYOK key store — encapsulates the only sanctioned reads/writes against
 * `byok_keys`. All callers go through this module so encryption + the
 * dual-control state machine are enforced in one place.
 *
 * Dual-control rotation (NCA ECC-2-12):
 *   - `createKey` → `status = 'pending'`. NOT yet usable.
 *   - `approveKey(id, approverId)` → must be a *different* admin than the
 *     creator; demotes the current active key to `'rotated'` and promotes
 *     this one to `'active'`.
 *   - `rejectKey(id)` → `pending` → `'revoked'`.
 *   - `revokeKey(id)` → `active` → `'revoked'`.
 *
 * Plaintext API keys never leave this module except via `withActivePlaintext`,
 * which decrypts within a callback scope and drops the reference after.
 *
 * @see lib/crypto/aes-gcm.ts (sealing)
 * @see db/schema/byok.ts
 * @see docs/adr/0004-dual-control-byok.md
 */
export type Provider = "anthropic" | "openai";
export type ByokStatus = "pending" | "active" | "rotated" | "revoked";

export interface ByokRowView {
  id: string;
  provider: Provider;
  label: string;
  status: ByokStatus;
  createdBy: string;
  approvedBy: string | null;
  createdAt: Date;
  approvedAt: Date | null;
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
    status: row.status,
    createdBy: row.createdBy,
    approvedBy: row.approvedBy,
    createdAt: row.createdAt,
    approvedAt: row.approvedAt,
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
 * Submit a new key for approval. It is stored sealed but `status = 'pending'`
 * and is NOT usable until a second admin approves it.
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
  const row: NewByokKey = {
    provider: input.provider,
    label: input.label,
    ciphertext: sealed.ciphertext,
    iv: sealed.iv,
    authTag: sealed.authTag,
    kekRef: "BYOK_KEK",
    status: "pending",
    isActive: false,
    createdBy: input.createdBy,
  };
  const [inserted] = await db
    .insert(schema.byokKeys)
    .values(row)
    .returning({ id: schema.byokKeys.id });
  return inserted.id;
}

export class DualControlViolation extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DualControlViolation";
  }
}

/**
 * Approve a pending key. The approver MUST differ from the creator
 * (dual control). On success: demote the current active key for the same
 * provider to `'rotated'`, promote this key to `'active'`.
 *
 * @throws {DualControlViolation} if the approver created the key.
 * @returns the demoted key's id (or null if there was no active key).
 */
export async function approveKey(
  id: string,
  approverId: string,
): Promise<{ demotedId: string | null }> {
  return db.transaction(async (tx) => {
    const [row] = await tx
      .select()
      .from(schema.byokKeys)
      .where(eq(schema.byokKeys.id, id))
      .limit(1);
    if (!row) throw new Error("Key not found.");
    if (row.status !== "pending") {
      throw new Error(`Key is ${row.status}, not pending.`);
    }
    if (row.createdBy === approverId) {
      throw new DualControlViolation(
        "The approver must be a different admin than the key's creator.",
      );
    }

    // Demote the current active key for this provider.
    const [demoted] = await tx
      .update(schema.byokKeys)
      .set({ status: "rotated", isActive: false, rotatedAt: new Date() })
      .where(
        and(
          eq(schema.byokKeys.provider, row.provider),
          eq(schema.byokKeys.status, "active"),
        ),
      )
      .returning({ id: schema.byokKeys.id });

    await tx
      .update(schema.byokKeys)
      .set({
        status: "active",
        isActive: true,
        approvedBy: approverId,
        approvedAt: new Date(),
      })
      .where(eq(schema.byokKeys.id, id));

    return { demotedId: demoted?.id ?? null };
  });
}

/** Reject a pending key (pending → revoked). */
export async function rejectKey(id: string): Promise<void> {
  await db
    .update(schema.byokKeys)
    .set({ status: "revoked", isActive: false, revokedAt: new Date() })
    .where(
      and(eq(schema.byokKeys.id, id), eq(schema.byokKeys.status, "pending")),
    );
}

/** Revoke an active key (active → revoked). */
export async function revokeKey(id: string): Promise<void> {
  await db
    .update(schema.byokKeys)
    .set({ status: "revoked", isActive: false, revokedAt: new Date() })
    .where(
      and(eq(schema.byokKeys.id, id), eq(schema.byokKeys.status, "active")),
    );
}

/**
 * Decrypt the active key for `provider` and pass it into the callback. The
 * plaintext is never returned to the caller directly.
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
        eq(schema.byokKeys.status, "active"),
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
