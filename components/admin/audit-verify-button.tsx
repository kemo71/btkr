"use client";

import { useState, useTransition } from "react";
import { Badge } from "@/components/dga";
import { verifyChainAction, type VerifyResult } from "@/app/[locale]/admin/audit/actions";

/**
 * Run the audit chain verifier from the admin UI. Surfaces the result
 * as a Badge — OK with total count, or DANGER pointing at the first
 * broken row id.
 */
export function AuditVerifyButton({
  labels,
}: {
  labels: { run: string; running: string; ok: string; broken: string };
}) {
  const [pending, start] = useTransition();
  const [result, setResult] = useState<VerifyResult | null>(null);

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          start(async () => {
            const r = await verifyChainAction();
            setResult(r);
          });
        }}
        className="inline-flex h-10 items-center justify-center rounded-md border border-primary-600 px-4 text-base font-medium text-primary-700 transition-colors hover:bg-primary-50 disabled:opacity-50"
      >
        {pending ? labels.running : labels.run}
      </button>
      {result ? (
        result.ok ? (
          <Badge tone="success" dot>
            {labels.ok}: {result.total}
          </Badge>
        ) : (
          <Badge tone="danger" dot>
            {labels.broken}: <span dir="ltr">{result.brokenAtId ?? "?"}</span>
          </Badge>
        )
      ) : null}
    </div>
  );
}
