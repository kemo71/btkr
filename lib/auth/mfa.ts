import "server-only";
import { createHmac } from "node:crypto";

/**
 * MFA — TOTP (RFC 6238) verification.
 *
 * Used as a *secondary* factor when the IdP does not assert that MFA was
 * already satisfied (`SsoIdentity.mfaSatisfied === false`) for a role that
 * requires it (admin, stakeholder). Enrollment (QR provisioning, recovery
 * codes) is Phase 1.5; the verification primitive is implemented here so
 * the session middleware can call it as soon as enrollment lands.
 *
 * Secrets are stored encrypted at rest using the same AES-GCM helper as
 * BYOK keys (`lib/crypto/aes-gcm.ts`).
 *
 * @see docs/security/nca-ecc-mapping.md §2-2-2 (MFA for privileged roles)
 */

const STEP_SECONDS = 30;
const DIGITS = 6;

/** RFC 4648 base32 decode (no padding handling needed for TOTP secrets). */
function base32Decode(input: string): Buffer {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const clean = input.replace(/=+$/g, "").toUpperCase();
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (const ch of clean) {
    const idx = alphabet.indexOf(ch);
    if (idx === -1) throw new Error("Invalid base32 character in TOTP secret.");
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

/** Compute the TOTP code for a given counter (time-step). */
function hotp(secret: Buffer, counter: number): string {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(BigInt(counter));
  const hmac = createHmac("sha1", secret).update(buf).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const code =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  return (code % 10 ** DIGITS).toString().padStart(DIGITS, "0");
}

/**
 * Verify a user-supplied 6-digit code against a base32 TOTP secret.
 * Accepts the current step ± 1 to tolerate clock skew (±30 s).
 *
 * @example
 * if (!verifyTotp(base32Secret, userCode)) throw new MfaFailed();
 */
export function verifyTotp(base32Secret: string, code: string): boolean {
  if (!/^\d{6}$/.test(code)) return false;
  const secret = base32Decode(base32Secret);
  const now = Math.floor(Date.now() / 1000);
  const counter = Math.floor(now / STEP_SECONDS);
  for (const drift of [-1, 0, 1]) {
    if (hotp(secret, counter + drift) === code) return true;
  }
  return false;
}

/**
 * Build the `otpauth://` provisioning URI for a QR code (enrollment, Phase
 * 1.5).
 *
 * @example
 * otpauthUri("alice@ksaa.gov.sa", base32Secret) // otpauth://totp/...
 */
export function otpauthUri(account: string, base32Secret: string): string {
  const issuer = encodeURIComponent("Btkr Valley");
  const label = encodeURIComponent(`${issuer}:${account}`);
  return `otpauth://totp/${label}?secret=${base32Secret}&issuer=${issuer}&digits=${DIGITS}&period=${STEP_SECONDS}`;
}
