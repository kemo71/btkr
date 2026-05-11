import {
  pgTable,
  uuid,
  text,
  timestamp,
  primaryKey,
  index,
} from "drizzle-orm/pg-core";
import { users } from "./users";

/**
 * RBAC — roles, permissions, and the join table linking users to roles.
 *
 * Permissions are encoded as `"<resource>:<action>"` strings (e.g.
 * `"idea:create"`, `"byok-key:rotate"`). The policy DSL in `lib/rbac/`
 * resolves a user's permission set by joining `user_roles` → `role_permissions`.
 *
 * Seed roles (in `db/seed/roles.ts`):
 *   - admin       — global system operator
 *   - stakeholder — exec / sponsor / dept head with gate-decision rights
 *   - employee    — default contributor role
 *   - auditor     — read-only cross-org observer
 *
 * @see docs/togaf/01-business-architecture.md §6 (Organizational Roles)
 */
export const roles = pgTable("roles", {
  id: uuid("id").defaultRandom().primaryKey(),
  /** Machine-readable handle, e.g. "admin". Lowercase, dash-separated. */
  slug: text("slug").notNull().unique(),
  /** Human-friendly Arabic name. */
  nameAr: text("name_ar").notNull(),
  nameEn: text("name_en").notNull(),
  descriptionAr: text("description_ar"),
  descriptionEn: text("description_en"),
  isSystem: text("is_system").notNull().default("false"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const permissions = pgTable("permissions", {
  id: uuid("id").defaultRandom().primaryKey(),
  /** Permission slug e.g. "idea:create", "audit:export", "byok-key:rotate". */
  slug: text("slug").notNull().unique(),
  descriptionEn: text("description_en"),
});

export const rolePermissions = pgTable(
  "role_permissions",
  {
    roleId: uuid("role_id")
      .notNull()
      .references(() => roles.id, { onDelete: "cascade" }),
    permissionId: uuid("permission_id")
      .notNull()
      .references(() => permissions.id, { onDelete: "cascade" }),
  },
  (t) => [
    primaryKey({ columns: [t.roleId, t.permissionId] }),
    index("role_perms_role_idx").on(t.roleId),
  ],
);

export const userRoles = pgTable(
  "user_roles",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    roleId: uuid("role_id")
      .notNull()
      .references(() => roles.id, { onDelete: "cascade" }),
    /** Optional scope: department / org-unit / project. Null = global. */
    scope: text("scope"),
    grantedBy: uuid("granted_by").references(() => users.id),
    grantedAt: timestamp("granted_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.roleId] }),
    index("user_roles_user_idx").on(t.userId),
  ],
);

export type Role = typeof roles.$inferSelect;
export type Permission = typeof permissions.$inferSelect;
export type UserRole = typeof userRoles.$inferSelect;
