import "server-only";
import { createHash } from "node:crypto";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";
import { seal, unseal } from "@/lib/crypto/aes-gcm";
import {
  generateTotpSecret,
  generateRecoveryCodes,
  verifyTotp,
} from "./mfa";

/**
 * MFA credential store — the only sanctioned access to `mfa_credentials`.
 *
 * TOTP secrets are sealed with AES-256-GCM (same KEK as BYOK keys);
 * recovery codes are stored as SHA-256 hashes. The plaintext secret +
 * recovery codes leave this module exactly once, at enrollment time, via
 * `beginEnrollment`.
 *
 * @see lib/auth/mfa.ts (TOTP + code generation)
 * @see db/schema/mfa.ts
 * @see lib/crypto/aes-gcm.ts
 */

function sha256hex(s: string): string {
  return createHash("sha256").update(s, "utf8").digest("hex");
}

export interface EnrollmentDraft {
  /** Base32 secret — show as a QR (otpauth URI) and let the user type it. */
  secret: string;
  /** Plaintext recovery codes — shown ONCE. */
  recoveryCodes: string[];
}

/** True if the user has a *confirmed* MFA enrollment. */
export async function isEnrolled(userId: string): Promise<boolean> {
  const [row] = await db
    .select({ confirmedAt: schema.mfaCredentials.confirmedAt })
    .from(schema.mfaCredentials)
    .where(eq(schema.mfaCredentials.userId, userId))
    .limit(1);
  return Boolean(row?.confirmedAt);
}

/**
 * Start (or restart) enrollment: generate a fresh secret + recovery codes,
 * upsert an *unconfirmed* row, and return the plaintext for the user to
 * scan/save. Confirming requires `confirmEnrollment` with a valid code.
 *
 * @example
 * const draft = await beginEnrollment(userId);
 * // render QR(otpauthUri(email, draft.secret)) and list draft.recoveryCodes
 */
export async function beginEnrollment(userId: string): Promise<EnrollmentDraft> {
  const secret = generateTotpSecret();
  const recoveryCodes = generateRecoveryCodes();
  const sealed = await seal(secret);
  const recoveryHashes = JSON.stringify(recoveryCodes.map(sha256hex));

  await db
    .insert(schema.mfaCredentials)
    .values({
      userId,
      secretCiphertext: sealed.ciphertext,
      secretIv: sealed.iv,
      secretAuthTag: sealed.authTag,
      kekRef: "BYOK_KEK",
      recoveryHashes,
      confirmedAt: null,
    })
    .onConflictDoUpdate({
      target: schema.mfaCredentials.userId,
      set: {
        secretCiphertext: sealed.ciphertext,
        secretIv: sealed.iv,
        secretAuthTag: sealed.authTag,
        kekRef: "BYOK_KEK",
        recoveryHashes,
        confirmedAt: null,
        lastUsedAt: null,
      },
    });

  return { secret, recoveryCodes };
}

/**
 * Confirm enrollment: verify the supplied TOTP code against the stored
 * (unconfirmed) secret; on success, set `confirmed_at`.
 *
 * @returns true on success.
 */
export async function confirmEnrollment(
  userId: string,
  code: string,
): Promise<boolean> {
  const [row] = await db
    .select()
    .from(schema.mfaCredentials)
    .where(eq(schema.mfaCredentials.userId, userId))
    .limit(1);
  if (!row || row.confirmedAt) return false;
  const secret = await unseal({
    ciphertext: row.secretCiphertext,
    iv: row.secretIv,
    authTag: row.secretAuthTag,
  });
  if (!verifyTotp(secret, code)) return false;
  await db
    .update(schema.mfaCredentials)
    .set({ confirmedAt: new Date(), lastUsedAt: new Date() })
    .where(eq(schema.mfaCredentials.userId, userId));
  return true;
}

/**
 * Verify a login-time second factor: accepts either a TOTP code or a
 * single-use recovery code. A recovery code is consumed (removed from the
 * stored set) on use.
 *
 * @returns true on success.
 */
export async function verifySecondFactor(
  userId: string,
  input: string,
): Promise<boolean> {
  const [row] = await db
    .select()
    .from(schema.mfaCredentials)
    .where(eq(schema.mfaCredentials.userId, userId))
    .limit(1);
  if (!row || !row.confirmedAt) return false;

  const trimmed = input.trim();

  // Recovery code path (contains a hyphen / not 6 digits).
  if (!/^\d{6}$/.test(trimmed)) {
    const hashes: string[] = JSON.parse(row.recoveryHashes || "[]");
    const h = sha256hex(trimmed.toLowerCase());
    const idx = hashes.indexOf(h);
    if (idx === -1) return false;
    hashes.splice(idx, 1); // consume it
    await db
      .update(schema.mfaCredentials)
      .set({ recoveryHashes: JSON.stringify(hashes), lastUsedAt: new Date() })
      .where(eq(schema.mfaCredentials.userId, userId));
    return true;
  }

  // TOTP path.
  const secret = await unseal({
    ciphertext: row.secretCiphertext,
    iv: row.secretIv,
    authTag: row.secretAuthTag,
  });
  if (!verifyTotp(secret, trimmed)) return false;
  await db
    .update(schema.mfaCredentials)
    .set({ lastUsedAt: new Date() })
    .where(eq(schema.mfaCredentials.userId, userId));
  return true;
}
