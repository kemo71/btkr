import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import QRCode from "qrcode";
import { db, schema } from "@/lib/db/client";
import { resolveSession } from "@/lib/auth/session";
import { isEnrolled, beginEnrollment } from "@/lib/auth/mfa-store";
import { otpauthUri } from "@/lib/auth/mfa";
import { Badge, Card, CardBody, CardHeader } from "@/components/dga";
import {
  confirmEnrollmentAction,
  verifyMfaAction,
  startEnrollmentAction,
} from "./actions";
import { MfaCodeForm } from "@/components/auth/mfa-code-form";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * /auth/mfa — second-factor gate. Lives under `[locale]` so it inherits the
 * locale-aware root layout; reachable at `/auth/mfa` (Arabic default) or
 * `/en/auth/mfa`.
 *
 * Two modes, decided by the current session + enrollment state:
 *   1. **Not enrolled** (privileged role, MFA required) → enrollment:
 *      generate a secret, show the QR (otpauth URI) + recovery codes once,
 *      confirm with a TOTP code.
 *   2. **Enrolled, session pending MFA** → verification: enter a TOTP or a
 *      recovery code.
 *
 * No session → /auth/login. Fully authenticated + already enrolled → /.
 *
 * @see app/[locale]/auth/mfa/actions.ts
 * @see lib/auth/mfa-store.ts
 */
export default async function MfaPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<React.ReactElement> {
  await params; // locale not needed beyond the route signature
  const session = await resolveSession();
  if (!session) redirect("/auth/login");

  const enrolled = await isEnrolled(session.userId);

  // Nothing to do: not pending and already enrolled.
  if (!session.mfaPending && enrolled) redirect("/");

  const [user] = await db
    .select({ email: schema.users.email })
    .from(schema.users)
    .where(eq(schema.users.id, session.userId));
  const email = user?.email ?? "user";

  if (!enrolled) {
    // Enrollment mode — (re)generate a draft. beginEnrollment is idempotent
    // per user (upsert), so refreshing the page reuses the same secret only
    // until confirmed; here we generate a fresh one each render which would
    // be wasteful — instead read an existing unconfirmed row if present.
    const [existing] = await db
      .select()
      .from(schema.mfaCredentials)
      .where(eq(schema.mfaCredentials.userId, session.userId))
      .limit(1);

    let secret: string;
    let recoveryCodes: string[] | null = null;
    if (existing && !existing.confirmedAt) {
      // Re-show the QR for the existing unconfirmed secret (decrypt it).
      // Recovery codes are NOT re-shown — they were displayed on first gen.
      const { unseal } = await import("@/lib/crypto/aes-gcm");
      secret = await unseal({
        ciphertext: existing.secretCiphertext,
        iv: existing.secretIv,
        authTag: existing.secretAuthTag,
      });
    } else {
      const draft = await beginEnrollment(session.userId);
      secret = draft.secret;
      recoveryCodes = draft.recoveryCodes;
    }

    const otpUri = otpauthUri(email, secret);
    const qrSvg = await QRCode.toString(otpUri, {
      type: "svg",
      margin: 1,
      width: 200,
    });

    return (
      <main className="mx-auto flex min-h-dvh max-w-xl flex-col gap-6 px-6 py-12">
        <header>
          <h1 className="text-3xl font-semibold tracking-tight text-neutral-900">
            تفعيل المصادقة الثنائية · Set up two-factor auth
          </h1>
          <p className="mt-2 text-sm text-neutral-600">
            دورك يتطلب عامل تحقق ثانٍ. امسح رمز QR بتطبيق المصادقة، ثم أدخل
            الرمز للتأكيد. · Your role requires a second factor. Scan the QR
            with an authenticator app and enter a code to confirm.
          </p>
        </header>

        <Card>
          <CardHeader title="1 — امسح الرمز · Scan" />
          <CardBody className="flex flex-col items-center gap-3">
            <div
              className="rounded-md border border-neutral-200 bg-white p-3"
              dangerouslySetInnerHTML={{ __html: qrSvg }}
            />
            <p className="text-xs text-neutral-500" dir="ltr">
              Or enter manually: <code className="font-mono">{secret}</code>
            </p>
          </CardBody>
        </Card>

        {recoveryCodes ? (
          <Card>
            <CardHeader
              title="2 — احفظ رموز الاسترداد · Save recovery codes"
              action={<Badge tone="warning">يُعرض مرة واحدة · Shown once</Badge>}
            />
            <CardBody>
              <p className="mb-2 text-xs text-neutral-500">
                خزّنها في مكان آمن. كل رمز يُستخدم مرة واحدة. · Store these
                somewhere safe. Each code works once.
              </p>
              <ul className="grid grid-cols-2 gap-1.5 font-mono text-sm" dir="ltr">
                {recoveryCodes.map((c) => (
                  <li
                    key={c}
                    className="rounded bg-neutral-50 px-2 py-1 text-neutral-800"
                  >
                    {c}
                  </li>
                ))}
              </ul>
            </CardBody>
          </Card>
        ) : null}

        <Card>
          <CardHeader title="3 — أدخل الرمز للتأكيد · Confirm with a code" />
          <CardBody>
            <MfaCodeForm
              action={confirmEnrollmentAction}
              label="رمز التحقق · Verification code"
              submitLabel="تأكيد · Confirm"
            />
            <form action={startEnrollmentAction} className="mt-3">
              <button
                type="submit"
                className="text-xs text-neutral-500 underline hover:text-neutral-700"
              >
                إعادة توليد السر · Regenerate secret
              </button>
            </form>
          </CardBody>
        </Card>
      </main>
    );
  }

  // Verification mode — enrolled, session pending MFA.
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-6 px-6 py-12">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight text-neutral-900">
          التحقق الثنائي · Two-factor verification
        </h1>
        <p className="mt-2 text-sm text-neutral-600">
          أدخل الرمز من تطبيق المصادقة، أو أحد رموز الاسترداد. · Enter the code
          from your authenticator app, or one of your recovery codes.
        </p>
      </header>
      <Card>
        <CardBody>
          <MfaCodeForm
            action={verifyMfaAction}
            label="الرمز · Code"
            submitLabel="تحقق · Verify"
          />
        </CardBody>
      </Card>
    </main>
  );
}
