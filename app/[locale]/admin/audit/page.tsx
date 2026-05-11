import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireActor } from "@/lib/auth/current-actor";
import { Badge, Card, CardBody, CardHeader, Field, Input, Select } from "@/components/dga";
import { LocaleSwitcher } from "@/components/ui/locale-switcher";
import { AuditVerifyButton } from "@/components/admin/audit-verify-button";
import { AuditCheckpointPanel } from "@/components/admin/audit-checkpoint-panel";
import { listAudit } from "@/lib/audit/queries";
import { latestCheckpoint } from "@/lib/audit/checkpoint";
import type { Locale } from "@/i18n/routing";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;
const CATEGORIES = ["auth", "rbac", "byok", "lifecycle", "config", "export"] as const;

function outcomeTone(o: "success" | "failure" | "denied") {
  return o === "success" ? "success" : o === "denied" ? "warning" : "danger";
}

/**
 * Audit Explorer.
 *
 * Auditor / admin-only. Paginated table with filters (category, date range),
 * one-click chain verification button, and per-row outcome badges. The
 * Phase 1 export is captured via the verify action's audit trail; Phase 2
 * adds a true `Download bundle` server action with WORM-bucket upload.
 */
export default async function AuditExplorerPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: Locale }>;
  searchParams: Promise<{
    category?: string;
    from?: string;
    to?: string;
    page?: string;
  }>;
}) {
  const { locale } = await params;
  const sp = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations("audit");

  await requireActor("audit:read");

  const page = Math.max(0, parseInt(sp.page ?? "0", 10) || 0);
  const filter = {
    category:
      sp.category && (CATEGORIES as readonly string[]).includes(sp.category)
        ? sp.category
        : undefined,
    from: sp.from ? new Date(sp.from) : undefined,
    to: sp.to ? new Date(sp.to) : undefined,
  };

  const { rows, total } = await listAudit(filter, page, PAGE_SIZE);
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const cp = await latestCheckpoint();
  const base = locale === "ar" ? "/admin/audit" : `/${locale}/admin/audit`;
  const buildHref = (next: number) => {
    const u = new URLSearchParams();
    if (filter.category) u.set("category", filter.category);
    if (sp.from) u.set("from", sp.from);
    if (sp.to) u.set("to", sp.to);
    if (next > 0) u.set("page", String(next));
    const q = u.toString();
    return q ? `${base}?${q}` : base;
  };

  return (
    <main className="mx-auto flex min-h-dvh max-w-6xl flex-col gap-6 px-6 py-12">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-semibold tracking-tight text-neutral-900">
            {t("page.title")}
          </h1>
          <p className="mt-2 text-base text-neutral-600">{t("page.subtitle")}</p>
        </div>
        <LocaleSwitcher />
      </header>

      <Card>
        <CardHeader title={t("chain.title")} subtitle={t("chain.subtitle")} />
        <CardBody>
          <AuditVerifyButton
            labels={{
              run: t("chain.run"),
              running: t("chain.running"),
              ok: t("chain.ok"),
              broken: t("chain.broken"),
            }}
          />
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title={t("checkpoint.title")}
          subtitle={t("checkpoint.subtitle")}
        />
        <CardBody>
          <AuditCheckpointPanel
            latest={
              cp
                ? {
                    rowCount: cp.rowCount,
                    entryHash: cp.entryHash,
                    takenAt: cp.createdAt
                      .toISOString()
                      .replace("T", " ")
                      .slice(0, 16),
                  }
                : null
            }
            labels={{
              none: t("checkpoint.none"),
              lastTitle: t("checkpoint.lastTitle"),
              coversRows: t("checkpoint.coversRows"),
              take: t("checkpoint.take"),
              taking: t("checkpoint.taking"),
              verify: t("checkpoint.verify"),
              verifying: t("checkpoint.verifying"),
              ok: t("checkpoint.ok"),
              failed: t("checkpoint.failed"),
            }}
          />
        </CardBody>
      </Card>

      <Card>
        <CardHeader title={t("filter.title")} />
        <CardBody>
          <form
            method="GET"
            className="grid gap-3 sm:grid-cols-[1fr_1fr_1fr_auto]"
          >
            <Field label={t("filter.category")}>
              {(p) => (
                <Select {...p} name="category" defaultValue={filter.category ?? ""}>
                  <option value="">{t("filter.allCategories")}</option>
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {t(`categories.${c}`)}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <Field label={t("filter.from")}>
              {(p) => <Input {...p} type="date" name="from" defaultValue={sp.from ?? ""} />}
            </Field>
            <Field label={t("filter.to")}>
              {(p) => <Input {...p} type="date" name="to" defaultValue={sp.to ?? ""} />}
            </Field>
            <div className="flex items-end">
              <button
                type="submit"
                className="inline-flex h-10 items-center justify-center rounded-md bg-primary-600 px-4 text-base font-medium text-white shadow-sm transition-colors hover:bg-primary-700"
              >
                {t("filter.apply")}
              </button>
            </div>
          </form>
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title={t("rows.title")}
          subtitle={t("rows.subtitle", { count: total, page: page + 1, pages: pageCount })}
        />
        <CardBody>
          {rows.length === 0 ? (
            <p className="text-sm text-neutral-500">{t("rows.empty")}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-start text-xs uppercase tracking-wide text-neutral-500">
                  <tr>
                    <th className="px-2 py-2 text-start">{t("rows.when")}</th>
                    <th className="px-2 py-2 text-start">{t("rows.category")}</th>
                    <th className="px-2 py-2 text-start">{t("rows.action")}</th>
                    <th className="px-2 py-2 text-start">{t("rows.actor")}</th>
                    <th className="px-2 py-2 text-start">{t("rows.target")}</th>
                    <th className="px-2 py-2 text-start">{t("rows.outcome")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {rows.map((r) => (
                    <tr key={r.id}>
                      <td className="px-2 py-2 text-xs text-neutral-500" dir="ltr">
                        {r.occurredAt.toISOString().replace("T", " ").slice(0, 19)}
                      </td>
                      <td className="px-2 py-2">
                        <Badge tone="neutral">{t(`categories.${r.category}`)}</Badge>
                      </td>
                      <td className="px-2 py-2 font-mono text-xs text-neutral-800" dir="ltr">
                        {r.action}
                      </td>
                      <td className="px-2 py-2 text-xs text-neutral-600">
                        {r.actorRoleSlug ?? "—"}
                      </td>
                      <td className="px-2 py-2 font-mono text-xs text-neutral-600" dir="ltr">
                        {r.target ?? "—"}
                      </td>
                      <td className="px-2 py-2">
                        <Badge tone={outcomeTone(r.outcome)} dot>
                          {t(`outcomes.${r.outcome}`)}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="mt-4 flex items-center justify-between">
            <a
              href={buildHref(Math.max(0, page - 1))}
              aria-disabled={page === 0}
              className={
                page === 0
                  ? "pointer-events-none text-sm text-neutral-300"
                  : "text-sm text-primary-700 hover:underline"
              }
            >
              ← {t("pager.prev")}
            </a>
            <span className="text-xs text-neutral-500">
              {t("pager.position", { page: page + 1, pages: pageCount })}
            </span>
            <a
              href={buildHref(Math.min(pageCount - 1, page + 1))}
              aria-disabled={page >= pageCount - 1}
              className={
                page >= pageCount - 1
                  ? "pointer-events-none text-sm text-neutral-300"
                  : "text-sm text-primary-700 hover:underline"
              }
            >
              {t("pager.next")} →
            </a>
          </div>
        </CardBody>
      </Card>
    </main>
  );
}
