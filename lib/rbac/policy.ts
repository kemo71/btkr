import "server-only";
import type { Permission } from "./permissions";

/**
 * RBAC policy DSL — deny-by-default permission resolver.
 *
 * Usage: load the actor's permission set once per request (cached against
 * the session), then call `can()` or `assertPermission()` at each protected
 * boundary (route handler, server action, page).
 *
 * The DSL is intentionally minimal: scope-aware permission checks are added
 * here later when the first scoped resource (e.g. department-bound idea)
 * lands. For now, scopes are passed through opaque.
 *
 * @see docs/togaf/01-business-architecture.md §6 (Roles)
 * @see lib/rbac/resolver.ts (DB-backed permission resolver)
 */
export interface Actor {
  userId: string;
  /** Resolved permission set for this request. */
  permissions: ReadonlySet<Permission>;
  /** Active role slugs, e.g. ["admin"]. Denormalized for audit logs. */
  roles: readonly string[];
  /** Optional scope hint (department / org-unit). */
  scope?: string;
}

/**
 * Pure check — returns true iff the actor has the permission.
 *
 * @example
 * if (can(actor, "byok-key:rotate")) { ... }
 */
export function can(actor: Actor, permission: Permission): boolean {
  return actor.permissions.has(permission);
}

/**
 * Throws `PermissionDenied` if the actor lacks the permission.
 * Use at the *boundary* of a protected operation.
 *
 * @example
 * assertPermission(actor, "gate:approve");
 * // ... safe to proceed
 */
export function assertPermission(
  actor: Actor,
  permission: Permission,
): asserts actor is Actor {
  if (!can(actor, permission)) {
    throw new PermissionDenied(actor, permission);
  }
}

/**
 * Thrown when an actor lacks a required permission. Carries enough context
 * for an audit-log entry without leaking sensitive details to the response.
 */
export class PermissionDenied extends Error {
  readonly userId: string;
  readonly required: Permission;
  readonly roles: readonly string[];

  constructor(actor: Actor, required: Permission) {
    super(`Permission denied: ${required}`);
    this.name = "PermissionDenied";
    this.userId = actor.userId;
    this.required = required;
    this.roles = actor.roles;
  }
}
