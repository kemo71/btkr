import {
  pgTable,
  uuid,
  text,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { users } from "./users";

/**
 * MFA credentials — one TOTP enrollment per user.
 *
 * The TOTP secret is stored encrypted (AES-256-GCM, same scheme as BYOK
 * keys — see `lib/crypto/aes-gcm.ts`). Recovery codes are stored as a JSON
 * array of SHA-256 hashes; the plaintext codes are shown to the user
 * exactly once at enrollment time.
 *
 * `confirmed_at` is null between "secret generated" and "user proved they
 * can produce a valid code" — an unconfirmed enrollment is treated as
 * not-enrolled.
 *
 * @see lib/auth/mfa.ts (TOTP verify), lib/auth/mfa-store.ts (this table)
 * @see db/schema/byok.ts (same encryption columns)
 * @see docs/security/nca-ecc-mapping.md §2-2-2 (MFA for privileged roles)
 */
export const mfaCredentials = pgTable(
  "mfa_credentials",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .unique()
      .references(() => users.id, { onDelete: "cascade" }),
    /** AES-256-GCM ciphertext (base64) of the base32 TOTP secret. */
    secretCiphertext: text("secret_ciphertext").notNull(),
    secretIv: text("secret_iv").notNull(),
    secretAuthTag: text("secret_auth_tag").notNull(),
    kekRef: text("kek_ref").notNull(),
    /** JSON array of SHA-256 hex hashes of single-use recovery codes. */
    recoveryHashes: text("recovery_hashes").notNull().default("[]"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    /** Null until the user proves they can produce a valid TOTP code. */
    confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
  },
  (t) => [index("mfa_user_idx").on(t.userId)],
);

export type MfaCredential = typeof mfaCredentials.$inferSelect;
export type NewMfaCredential = typeof mfaCredentials.$inferInsert;
