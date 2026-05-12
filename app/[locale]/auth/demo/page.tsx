import { notFound } from "next/navigation";
import { isDemoMode, DEMO_ROLE_SLUGS } from "@/lib/auth/demo";
import { Badge, Card, CardBody, CardHeader } from "@/components/dga";
import { signInAsDemoAction } from "./actions";

export const dynamic = "force-dynamic";

/**
 * /auth/demo — role picker for production-safe demo mode.
 *
 * 404s unless `BTKR_DEMO_MODE=1`. Each button signs the visitor in as the
 * seeded user for that role (a real session, real RBAC). Bilingual inline
 * copy (the route lives under `[locale]` so it gets the locale layout —
 * including the DEMO MODE banner).
 *
 * @see lib/auth/demo.ts
 * @see app/[locale]/auth/demo/actions.ts
 */
export default async function DemoLoginPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  await params;
  const { error } = await searchParams;
  if (!isDemoMode()) notFound();

  const roleCopy: Record<
    (typeof DEMO_ROLE_SLUGS)[number],
    { ar: string; en: string; descAr: string; descEn: string }
  > = {
    admin: {
      ar: "مدير النظام",
      en: "Administrator",
      descAr: "كل شيء: المستخدمون، الصلاحيات، مفاتيح BYOK، سجل التدقيق",
      descEn: "Everything: users, RBAC, BYOK keys, audit log",
    },
    stakeholder: {
      ar: "صاحب مصلحة",
      en: "Stakeholder",
      descAr: "اللوحات، قرارات البوابات المرحلية",
      descEn: "Dashboards, stage-gate decisions",
    },
    employee: {
      ar: "موظف",
      en: "Employee",
      descAr: "تقديم الأفكار، التصويت، المدرّب الابتكاري",
      descEn: "Submit ideas, vote, AI coach",
    },
    auditor: {
      ar: "مدقق",
      en: "Auditor",
      descAr: "قراءة فقط: السجلات، اللوحات",
      descEn: "Read-only: logs, dashboards",
    },
  };

  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col gap-6 px-6 py-12">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight text-neutral-900">
          الدخول التجريبي · Demo sign-in
        </h1>
        <p className="text-sm text-neutral-600">
          اختر دوراً للاستكشاف. هذه بيئة عرض — البيانات عامة وقد تُعدّل وتُعاد
          تهيئتها. · Pick a role to explore. This is a demo environment — data is
          public and may be modified / reset.
        </p>
      </header>

      {error === "seed" ? (
        <Badge tone="danger">
          المستخدمون التجريبيون غير موجودين — شغّل <code>pnpm db:seed</code>. ·
          Demo users not seeded — run <code>pnpm db:seed</code>.
        </Badge>
      ) : null}

      <Card>
        <CardHeader title="الأدوار · Roles" />
        <CardBody className="flex flex-col gap-2">
          {DEMO_ROLE_SLUGS.map((slug) => {
            const c = roleCopy[slug];
            return (
              <form key={slug} action={signInAsDemoAction}>
                <input type="hidden" name="role" value={slug} />
                <button
                  type="submit"
                  className="flex w-full items-center justify-between gap-3 rounded-md border border-neutral-200 bg-white px-4 py-3 text-start transition-colors hover:bg-primary-50 hover:border-primary-300"
                >
                  <span className="flex flex-col">
                    <span className="font-medium text-neutral-900">
                      {c.ar} · {c.en}
                    </span>
                    <span className="text-xs text-neutral-500">
                      {c.descAr} · {c.descEn}
                    </span>
                  </span>
                  <span aria-hidden className="text-primary-600">
                    →
                  </span>
                </button>
              </form>
            );
          })}
        </CardBody>
      </Card>
    </main>
  );
}
