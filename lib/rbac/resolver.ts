import "server-only";
import { and, eq, isNull, gt, or } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";
import type { Actor } from "./policy";
import type { Permission } from "./permissions";
import { isPermission } from "./permissions";

/**
 * Resolve a user's effective permission set from the DB.
 *
 * Joins `users → user_roles → role_permissions → permissions`, filters out
 * expired grants, and returns a deduplicated `Set<Permission>` ready to
 * back the policy DSL.
 *
 * Cache hint: call once per request (or per session) — not per check.
 *
 * @example
 * const actor = await resolveActor(userId);
 * if (can(actor, "byok-key:rotate")) ...
 */
export async function resolveActor(userId: string): Promise<Actor> {
  const now = new Date();

  const rows = await db
    .select({
      roleSlug: schema.roles.slug,
      permissionSlug: schema.permissions.slug,
    })
    .from(schema.userRoles)
    .innerJoin(schema.roles, eq(schema.roles.id, schema.userRoles.roleId))
    .innerJoin(
      schema.rolePermissions,
      eq(schema.rolePermissions.roleId, schema.userRoles.roleId),
    )
    .innerJoin(
      schema.permissions,
      eq(schema.permissions.id, schema.rolePermissions.permissionId),
    )
    .where(
      and(
        eq(schema.userRoles.userId, userId),
        or(
          isNull(schema.userRoles.expiresAt),
          gt(schema.userRoles.expiresAt, now),
        ),
      ),
    );

  const permissions = new Set<Permission>();
  const roles = new Set<string>();
  for (const r of rows) {
    roles.add(r.roleSlug);
    if (isPermission(r.permissionSlug)) {
      permissions.add(r.permissionSlug);
    }
  }

  return {
    userId,
    permissions,
    roles: Array.from(roles),
  };
}
