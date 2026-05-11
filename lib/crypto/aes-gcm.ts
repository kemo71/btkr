import "server-only";
import { webcrypto } from "node:crypto";

/**
 * AES-256-GCM helpers for BYOK key encryption.
 *
 * The Key Encryption Key (KEK) is loaded from the environment variable
 * `BYOK_KEK` and MUST be 32 bytes of base64-encoded random material. In
 * production the KEK lives in the cloud KMS / HSM (e.g. SDAIA or a managed
 * KMS in the KSA region), and `BYOK_KEK` is sourced from the platform
 * secret manager — never committed.
 *
 * Output format: three base64 blobs (`ciphertext`, `iv`, `authTag`) stored
 * separately in the `byok_keys` table.
 *
 * Per NCA ECC, secrets are never logged or returned in API responses.
 *
 * @see docs/security/nca-ecc-mapping.md (control mapping)
 * @see db/schema/byok.ts
 */
const ALGO = "AES-GCM" as const;
const IV_BYTES = 12;
const KEY_BYTES = 32; // 256-bit

export interface SealedSecret {
  ciphertext: string; // base64
  iv: string; // base64
  authTag: string; // base64
}

/**
 * Load the KEK (Key Encryption Key) from the environment.
 *
 * @throws if BYOK_KEK is unset, malformed, or not 32 bytes.
 */
async function loadKek(): Promise<CryptoKey> {
  const raw = process.env.BYOK_KEK;
  if (!raw) {
    throw new Error(
      "BYOK_KEK is not set. Configure a 32-byte base64 KEK from the platform secret manager.",
    );
  }
  const buf = Buffer.from(raw, "base64");
  if (buf.byteLength !== KEY_BYTES) {
    throw new Error(
      `BYOK_KEK must decode to ${KEY_BYTES} bytes; got ${buf.byteLength}.`,
    );
  }
  return webcrypto.subtle.importKey(
    "raw",
    buf,
    { name: ALGO, length: 256 },
    /* extractable */ false,
    ["encrypt", "decrypt"],
  );
}

/**
 * Seal a plaintext secret (e.g. an AI provider API key) with AES-256-GCM.
 *
 * @example
 * const sealed = await seal("sk-ant-...");
 * await db.insert(byokKeys).values({ ...sealed, kekRef: "BYOK_KEK", ... });
 */
export async function seal(plaintext: string): Promise<SealedSecret> {
  const key = await loadKek();
  const iv = webcrypto.getRandomValues(new Uint8Array(IV_BYTES));
  const data = new TextEncoder().encode(plaintext);

  const ct = await webcrypto.subtle.encrypt({ name: ALGO, iv }, key, data);
  const ctBytes = new Uint8Array(ct);

  // WebCrypto returns ciphertext || authTag concatenated. Split the last 16 bytes.
  const TAG_BYTES = 16;
  const ciphertext = ctBytes.slice(0, ctBytes.length - TAG_BYTES);
  const authTag = ctBytes.slice(ctBytes.length - TAG_BYTES);

  return {
    ciphertext: Buffer.from(ciphertext).toString("base64"),
    iv: Buffer.from(iv).toString("base64"),
    authTag: Buffer.from(authTag).toString("base64"),
  };
}

/**
 * Unseal a previously sealed secret. Throws on tampering (authTag mismatch).
 *
 * @example
 * const plaintext = await unseal(row);
 * // pass to AI provider client, then drop from memory.
 */
export async function unseal(sealed: SealedSecret): Promise<string> {
  const key = await loadKek();
  const iv = Buffer.from(sealed.iv, "base64");
  const ct = Buffer.from(sealed.ciphertext, "base64");
  const tag = Buffer.from(sealed.authTag, "base64");
  const combined = Buffer.concat([ct, tag]);

  const pt = await webcrypto.subtle.decrypt(
    { name: ALGO, iv },
    key,
    combined,
  );
  return new TextDecoder().decode(pt);
}
