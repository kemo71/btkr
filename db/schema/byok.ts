import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  index,
} from "drizzle-orm/pg-core";
import { users } from "./users";

/**
 * BYOK — encrypted AI provider keys.
 *
 * Per Architecture Principle AP3, Btkr Valley holds **no standing AI keys**
 * in code or environment variables. Admin users supply keys via a secure UI;
 * they are encrypted (AES-256-GCM) by `lib/crypto/` using a KEK from the
 * environment (`BYOK_KEK`), and only decrypted at request time on the server.
 *
 * Dual-control rotation (NCA ECC-2-12):
 *   1. Admin A creates a new key → `status = 'pending'`, `is_active = false`.
 *   2. A *different* admin B approves → `status = 'active'`, `is_active = true`,
 *      `approved_by = B`; the previously active key → `status = 'rotated'`,
 *      `is_active = false`. (Or B rejects → `status = 'revoked'`.)
 *   3. Old rows are retained (history) for at least 90 days for audit.
 *
 * `is_active` is kept as a denormalized convenience (= `status === 'active'`);
 * `status` is the source of truth.
 *
 * @see lib/crypto/aes-gcm.ts (encryption/decryption helpers)
 * @see lib/ai/byok-store.ts (server-side accessor)
 * @see docs/adr/0004-dual-control-byok.md
 * @see docs/security/nca-ecc-mapping.md
 */
export const byokKeys = pgTable(
  "byok_keys",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    provider: text("provider")
      .notNull()
      .$type<"anthropic" | "openai">(),
    /** Friendly label e.g. "Prod Anthropic — rotated 2026-Q2". */
    label: text("label").notNull(),
    /** AES-256-GCM ciphertext (base64) of the API key. */
    ciphertext: text("ciphertext").notNull(),
    /** IV / nonce (base64), 12 bytes for GCM. */
    iv: text("iv").notNull(),
    /** Authenticated-data tag (base64) returned by GCM. */
    authTag: text("auth_tag").notNull(),
    /** Identifier of the KEK used (env name); enables KEK rotation. */
    kekRef: text("kek_ref").notNull(),
    /** Lifecycle status — source of truth. */
    status: text("status")
      .notNull()
      .$type<"pending" | "active" | "rotated" | "revoked">()
      .default("pending"),
    /** Denormalized: `status === 'active'`. */
    isActive: boolean("is_active").notNull().default(false),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    /** Second-party approver (must differ from `created_by`). */
    approvedBy: uuid("approved_by").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    rotatedAt: timestamp("rotated_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
  },
  (t) => [
    index("byok_provider_status_idx").on(t.provider, t.status),
  ],
);

export type ByokKey = typeof byokKeys.$inferSelect;
export type NewByokKey = typeof byokKeys.$inferInsert;
