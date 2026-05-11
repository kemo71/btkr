/**
 * RBAC permission catalog.
 *
 * Every protected action MUST be encoded here. The Permission strings are
 * `<resource>:<action>` and the seed in `db/seed/roles.ts` maps each role to
 * its allowed permissions.
 *
 * Adding a new permission:
 *   1. Add the literal to `PERMISSIONS`.
 *   2. Update `db/seed/roles.ts` so at least one role gets it.
 *   3. Call `assertPermission()` from the route or server action.
 *
 * @see docs/togaf/01-business-architecture.md §6 (Roles)
 */
export const PERMISSIONS = [
  // --- Identity & access ---
  "user:read",
  "user:invite",
  "user:deactivate",
  "rbac:grant",
  "rbac:revoke",
  "rbac:read",

  // --- Idea lifecycle ---
  "idea:read",
  "idea:create",
  "idea:edit-own",
  "idea:edit-any",
  "idea:archive",
  "idea:vote",
  "idea:comment",

  // --- Gate decisions ---
  "gate:approve",
  "gate:reject",
  "gate:configure",

  // --- Coaching & frameworks ---
  "coach:use",
  "framework:select",
  "framework:configure",

  // --- BYOK / AI keys ---
  "byok-key:read",
  "byok-key:create",
  "byok-key:rotate",
  "byok-key:revoke",

  // --- Audit & exports ---
  "audit:read",
  "audit:export",

  // --- System configuration ---
  "config:read",
  "config:write",
  "branding:write",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

/** Type predicate — useful when validating untrusted input. */
export function isPermission(value: string): value is Permission {
  return (PERMISSIONS as readonly string[]).includes(value);
}
