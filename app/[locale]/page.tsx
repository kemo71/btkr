import { getTranslations, setRequestLocale } from "next-intl/server";
import { LocaleSwitcher } from "@/components/ui/locale-switcher";
import { AuthMenu } from "@/components/ui/auth-menu";
import { Badge, Card, CardBody, CardHeader } from "@/components/dga";
import { tryGetCurrentActor } from "@/lib/auth/current-actor";
import { can } from "@/lib/rbac";
import type { Locale } from "@/i18n/routing";

// Dynamic: renders the AuthMenu, which reads the session cookie.
export const dynamic = "force-dynamic";

/**
 * Btkr Valley landing page.
 *
 * Renders Arabic-first content using the DGA-aligned primitives in
 * `components/dga/`. Layout uses CSS logical properties so it mirrors
 * automatically under RTL.
 */
export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("home");
  const tn = await getTranslations("nav");
  const ta = await getTranslations("auth");

  const actor = await tryGetCurrentActor();
  const p = (path: string) => (locale === "ar" ? path : `/${locale}${path}`);
  const navLinks: { href: string; label: string }[] = actor
    ? [
        { href: p("/ideas"), label: tn("ideas") },
        { href: p("/coach"), label: tn("coach") },
        { href: p("/frameworks"), label: tn("frameworks") },
        ...(can(actor, "idea:read")
          ? [
              { href: p("/dashboard"), label: tn("dashboard") },
              { href: p("/leaderboard"), label: tn("leaderboard") },
            ]
          : []),
        ...(can(actor, "byok-key:read") || can(actor, "audit:read")
          ? [{ href: p("/admin/byok"), label: tn("admin") }]
          : []),
      ]
    : [{ href: p("/frameworks"), label: tn("frameworks") }];

  return (
    <main className="mx-auto flex min-h-dvh max-w-3xl flex-col gap-8 px-6 py-12">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <Badge tone="success" dot>
          {t("badge")}
        </Badge>
        <div className="flex items-center gap-3">
          <LocaleSwitcher />
          <AuthMenu signInLabel={ta("signIn")} signOutLabel={ta("signOut")} />
        </div>
      </header>

      <nav className="flex flex-wrap gap-2">
        {navLinks.map((l) => (
          <a
            key={l.href}
            href={l.href}
            className="rounded-md bg-neutral-100 px-3 py-1.5 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-200"
          >
            {l.label}
          </a>
        ))}
      </nav>

      <section className="flex flex-col gap-4">
        <h1 className="text-5xl font-semibold tracking-tight text-neutral-900">
          {t("title")}
        </h1>
        <p className="max-w-prose text-lg text-neutral-600">
          {t("description")}
        </p>
        <div className="flex flex-wrap gap-3 pt-2">
          <a
            href="https://github.com/kemo71/btkr/tree/main/docs/togaf"
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-12 items-center justify-center rounded-lg bg-primary-600 px-5 text-lg font-medium text-white shadow-sm transition-colors duration-[var(--duration-base)] hover:bg-primary-700"
          >
            {t("ctaArchitecture")}
          </a>
          <a
            href="https://web.dev/progressive-web-apps/"
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-12 items-center justify-center rounded-lg border border-primary-600 px-5 text-lg font-medium text-primary-700 transition-colors duration-[var(--duration-base)] hover:bg-primary-50"
          >
            {t("ctaPwa")}
          </a>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader title={t("cards.lifecycle.title")} subtitle="V1" />
          <CardBody>
            <p className="text-sm text-neutral-600">
              {t("cards.lifecycle.body")}
            </p>
          </CardBody>
        </Card>
        <Card>
          <CardHeader title={t("cards.coach.title")} subtitle="AI · BYOK" />
          <CardBody>
            <p className="text-sm text-neutral-600">{t("cards.coach.body")}</p>
          </CardBody>
        </Card>
        <Card>
          <CardHeader title={t("cards.frameworks.title")} subtitle="V2" />
          <CardBody>
            <p className="text-sm text-neutral-600">
              {t("cards.frameworks.body")}
            </p>
          </CardBody>
        </Card>
      </section>
    </main>
  );
}
