"use server";

import { headers } from "next/headers";
import { redirect, notFound } from "next/navigation";
import { isDemoMode, isDemoRole, demoEmailFor } from "@/lib/auth/demo";
import { createDemoSession } from "@/lib/auth/session";
import { audit } from "@/lib/audit/writer";

/**
 * Demo sign-in server action.
 *
 * 404s unless `BTKR_DEMO_MODE=1`. Creates a real session bound to the
 * seeded user for the chosen role, audits `auth.demo.login`, then sends the
 * visitor home. No MFA prompt (demo skips it).
 *
 * @see lib/auth/demo.ts
 * @see lib/auth/session.ts (`createDemoSession`)
 */
export async function signInAsDemoAction(formData: FormData): Promise<void> {
  if (!isDemoMode()) notFound();

  const role = String(formData.get("role") ?? "");
  if (!isDemoRole(role)) notFound();

  const h = await headers();
  const meta = {
    ipAddress: h.get("x-forwarded-for"),
    userAgent: h.get("user-agent"),
  };

  const result = await createDemoSession(demoEmailFor(role), meta);
  await audit({
    category: "auth",
    action: "auth.demo.login",
    outcome: result ? "success" : "failure",
    actorId: result?.userId ?? null,
    actorRoleSlug: result?.roleSlugs[0] ?? null,
    details: { role, reason: result ? undefined : "seeded_user_missing" },
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent,
  });

  if (!result) {
    // Seed not run — surface a hint via the picker page.
    redirect("/auth/demo?error=seed");
  }
  redirect("/");
}
