/**
 * RBAC barrel.
 *
 * Public surface for the rest of the app:
 *   - `Permission` literal type and `PERMISSIONS` catalog
 *   - `Actor` shape and `can()` / `assertPermission()` checks
 *   - `resolveActor(userId)` to load the actor from the DB
 *
 * @see docs/togaf/01-business-architecture.md §6 (Roles)
 */
export { PERMISSIONS, type Permission, isPermission } from "./permissions";
export {
  can,
  assertPermission,
  PermissionDenied,
  type Actor,
} from "./policy";
export { resolveActor } from "./resolver";
