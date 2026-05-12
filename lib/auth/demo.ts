import "server-only";

/**
 * Demo mode — a production-safe way to show the authenticated app without an
 * IdP.
 *
 * **Off by default.** It activates only when `BTKR_DEMO_MODE=1` is set in the
 * environment (a deliberate choice by whoever runs the deployment). When on:
 *   - `/auth/demo` exposes a role picker; "Continue as <role>" creates a
 *     *real* session bound to a *real* seeded user with that real role —
 *     everything still goes through the normal RBAC / audit / CSP path.
 *   - A loud "DEMO MODE" banner shows on every page.
 *   - The login route, when no IdP is configured, sends users to `/auth/demo`
 *     instead of returning 503.
 *
 * Unlike the dev shim (`BTKR_DEV_USER`), which is hard-disabled in
 * production, demo mode is meant to be enabled in production — but only on a
 * deployment where exposing the seeded data is acceptable.
 *
 * @see app/[locale]/auth/demo/page.tsx
 * @see lib/auth/session.ts (`createDemoSession`)
 * @see components/ui/demo-banner.tsx
 */
export function isDemoMode(): boolean {
  return process.env.BTKR_DEMO_MODE === "1";
}

/** The seeded roles a demo visitor may sign in as. */
export const DEMO_ROLE_SLUGS = [
  "admin",
  "stakeholder",
  "employee",
  "auditor",
] as const;

export type DemoRoleSlug = (typeof DEMO_ROLE_SLUGS)[number];

/** The seeded user email for a demo role (matches `db/seed/roles.ts`). */
export function demoEmailFor(slug: DemoRoleSlug): string {
  return `${slug}@ksaa.gov.sa`;
}

export function isDemoRole(value: string): value is DemoRoleSlug {
  return (DEMO_ROLE_SLUGS as readonly string[]).includes(value);
}
