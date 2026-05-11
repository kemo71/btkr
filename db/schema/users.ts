import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  index,
} from "drizzle-orm/pg-core";

/**
 * Users — identity records.
 *
 * Federated SSO is the production path (OIDC / SAML); the `password_hash`
 * column is retained for the local-dev seed admin only and is null for SSO
 * users.
 *
 * @see lib/auth — session and SSO adapter
 * @see lib/rbac — role + permission resolution
 */
export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    email: text("email").notNull().unique(),
    fullName: text("full_name").notNull(),
    preferredLocale: text("preferred_locale").notNull().default("ar"),
    department: text("department"),
    /** Null for SSO-only accounts. Argon2id hash otherwise. */
    passwordHash: text("password_hash"),
    /** External SSO subject (e.g. OIDC `sub`). Null until first SSO login. */
    ssoSubject: text("sso_subject"),
    mfaEnrolled: boolean("mfa_enrolled").notNull().default(false),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
  },
  (t) => [index("users_email_idx").on(t.email)],
);

/** Active sessions. Short-lived tokens, rotating refresh in HTTP-only cookie. */
export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    /** SHA-256 hash of the session token (token itself is never stored). */
    tokenHash: text("token_hash").notNull().unique(),
    userAgent: text("user_agent"),
    ipAddress: text("ip_address"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    /**
     * True when SSO succeeded but a required MFA second factor has not yet
     * been satisfied. The actor resolver treats such sessions as
     * unauthenticated for everything except the `/auth/mfa` flow, which
     * flips this to false on a successful TOTP verification.
     */
    mfaPending: boolean("mfa_pending").notNull().default(false),
  },
  (t) => [
    index("sessions_user_idx").on(t.userId),
    index("sessions_expires_idx").on(t.expiresAt),
  ],
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Session = typeof sessions.$inferSelect;
