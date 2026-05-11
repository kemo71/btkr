import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireActor } from "@/lib/auth/current-actor";
import { can } from "@/lib/rbac";
import { listKeys } from "@/lib/ai/byok-store";
import { Badge, Card, CardBody, CardHeader } from "@/components/dga";
import type { Locale } from "@/i18n/routing";
import { ByokCreateForm } from "@/components/admin/byok-create-form";
import { ByokRevokeButton } from "@/components/admin/byok-revoke-button";
import { ByokPendingActions } from "@/components/admin/byok-pending-actions";
import { LocaleSwitcher } from "@/components/ui/locale-switcher";

const STATUS_TONE = {
  pending: "warning",
  active: "success",
  rotated: "neutral",
  revoked: "danger",
} as const;

// Always render per-request: depends on the current actor + DB state.
export const dynamic = "force-dynamic";

/**
 * BYOK Admin page — list, add, rotate, revoke AI provider keys.
 *
 * Access: requires `byok-key:read` (admin only by default). Plaintext keys
 * are NEVER displayed; only metadata + a cosmetic suffix of the ciphertext
 * is shown.
 *
 * @see lib/ai/byok-store.ts (canonical store)
 * @see docs/security/nca-ecc-mapping.md §2-6 (Cryptography)
 */
export default async function ByokAdminPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("byok");

  const actor = await requireActor("byok-key:read");

  const keys = await listKeys();
  const canCreate = can(actor, "byok-key:create");
  const canRevoke = can(actor, "byok-key:revoke");
  const canApprove = can(actor, "byok-key:rotate");

  return (
    <main className="mx-auto flex min-h-dvh max-w-5xl flex-col gap-8 px-6 py-12">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-semibold tracking-tight text-neutral-900">
            {t("page.title")}
          </h1>
          <p className="mt-2 max-w-prose text-base text-neutral-600">
            {t("page.subtitle")}
          </p>
        </div>
        <LocaleSwitcher />
      </header>

      {canCreate ? (
        <Card>
          <CardHeader title={t("create.title")} subtitle={t("create.subtitle")} />
          <CardBody>
            <ByokCreateForm
              labels={{
                provider: t("fields.provider"),
                label: t("fields.label"),
                key: t("fields.key"),
                keyHint: t("fields.keyHint"),
                submit: t("create.submit"),
                anthropic: t("providers.anthropic"),
                openai: t("providers.openai"),
              }}
            />
          </CardBody>
        </Card>
      ) : null}

      <Card>
        <CardHeader
          title={t("list.title")}
          subtitle={t("list.subtitle", { count: keys.length })}
        />
        <CardBody>
          {keys.length === 0 ? (
            <p className="text-sm text-neutral-500">{t("list.empty")}</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {keys.map((k) => (
                <li
                  key={k.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-neutral-200 bg-white px-4 py-3"
                >
                  <div className="flex min-w-0 flex-col">
                    <div className="flex items-center gap-2">
                      <Badge tone={STATUS_TONE[k.status]} dot>
                        {t(`status.${k.status}`)}
                      </Badge>
                      <span className="font-medium text-neutral-900">
                        {k.label}
                      </span>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-neutral-500">
                      <span>{t(`providers.${k.provider}`)}</span>
                      <span>·</span>
                      <span dir="ltr">…{k.ciphertextSuffix}</span>
                      <span>·</span>
                      <span>
                        {t("list.createdAt")}{" "}
                        <time dateTime={k.createdAt.toISOString()}>
                          {k.createdAt.toISOString().slice(0, 10)}
                        </time>
                      </span>
                    </div>
                  </div>
                  {k.status === "pending" && canApprove ? (
                    <ByokPendingActions
                      id={k.id}
                      ownedByMe={k.createdBy === actor.userId}
                      labels={{
                        approve: t("list.approve"),
                        reject: t("list.reject"),
                        ownGuard: t("list.ownGuard"),
                      }}
                    />
                  ) : k.status === "active" && canRevoke ? (
                    <ByokRevokeButton id={k.id} label={t("list.revoke")} />
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>
    </main>
  );
}
