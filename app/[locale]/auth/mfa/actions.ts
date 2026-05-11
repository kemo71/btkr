"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { resolveSession, completeMfaForCurrentSession } from "@/lib/auth/session";
import {
  beginEnrollment,
  confirmEnrollment,
  isEnrolled,
  verifySecondFactor,
} from "@/lib/auth/mfa-store";
import { audit } from "@/lib/audit/writer";

/**
 * MFA flow server actions.
 *
 * These operate on the *current session* via the cookie — they intentionally
 * do NOT call `getCurrentActor()` because a session in `mfa_pending` state
 * is treated as unauthenticated there. They use `resolveSession()` directly.
 *
 * @see lib/auth/session.ts
 * @see lib/auth/mfa-store.ts
 */

const codeSchema = z.object({ code: z.string().min(6).max(20) });

export interface MfaResult {
  ok: boolean;
  message?: string;
}

/** Start (or restart) enrollment; returns nothing — the page re-reads state. */
export async function startEnrollmentAction(): Promise<void> {
  const session = await resolveSession();
  if (!session) redirect("/auth/login");
  await beginEnrollment(session.userId);
  await audit({
    category: "auth",
    action: "mfa.enroll.begin",
    outcome: "success",
    actorId: session.userId,
  });
  redirect("/auth/mfa");
}

/** Confirm a freshly-generated secret with a valid TOTP code. */
export async function confirmEnrollmentAction(
  _: MfaResult | null,
  formData: FormData,
): Promise<MfaResult> {
  const session = await resolveSession();
  if (!session) redirect("/auth/login");
  const parsed = codeSchema.safeParse({ code: formData.get("code") });
  if (!parsed.success) return { ok: false, message: "Invalid code." };

  const ok = await confirmEnrollment(session.userId, parsed.data.code);
  await audit({
    category: "auth",
    action: "mfa.enroll.confirm",
    outcome: ok ? "success" : "failure",
    actorId: session.userId,
  });
  if (!ok) return { ok: false, message: "That code didn't match. Try again." };

  // If the current session was pending MFA, completing enrollment also
  // satisfies the second factor for this login.
  if (session.mfaPending) await completeMfaForCurrentSession();
  redirect("/");
}

/** Login-time second-factor check (TOTP or recovery code). */
export async function verifyMfaAction(
  _: MfaResult | null,
  formData: FormData,
): Promise<MfaResult> {
  const session = await resolveSession();
  if (!session) redirect("/auth/login");
  const parsed = codeSchema.safeParse({ code: formData.get("code") });
  if (!parsed.success) return { ok: false, message: "Invalid code." };

  if (!(await isEnrolled(session.userId))) {
    // Privileged role, MFA required, but not enrolled — push to enrollment.
    redirect("/auth/mfa");
  }

  const ok = await verifySecondFactor(session.userId, parsed.data.code);
  await audit({
    category: "auth",
    action: "mfa.verify",
    outcome: ok ? "success" : "failure",
    actorId: session.userId,
  });
  if (!ok) return { ok: false, message: "Incorrect code." };

  await completeMfaForCurrentSession();
  redirect("/");
}
