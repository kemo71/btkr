import {
  pgTable,
  uuid,
  text,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { users } from "./users";

/**
 * Accreditations — external innovation certifications earned by employees,
 * and internal badges issued by Btkr Valley itself.
 *
 * Recognized providers (extensible):
 *   - GInI  — Global Innovation Institute
 *   - NPDP  — New Product Development Professional (PDMA)
 *   - IDEO U
 *   - INTERNAL — Btkr Valley internal badge
 *
 * @see docs/togaf/01-business-architecture.md §9 (KPIs)
 */
export const accreditations = pgTable(
  "accreditations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    provider: text("provider")
      .notNull()
      .$type<"GINI" | "NPDP" | "IDEOU" | "INTERNAL">(),
    /** Provider-specific certification code / level. */
    code: text("code").notNull(),
    titleAr: text("title_ar").notNull(),
    titleEn: text("title_en").notNull(),
    /** External verification URL or attestation reference. */
    verificationUrl: text("verification_url"),
    issuedAt: timestamp("issued_at", { withTimezone: true }).notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    /** Optional reviewer who confirmed the external credential. */
    verifiedBy: uuid("verified_by").references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("accred_user_idx").on(t.userId),
    index("accred_provider_idx").on(t.provider),
  ],
);

export type Accreditation = typeof accreditations.$inferSelect;
