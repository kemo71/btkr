"use client";

import { useState, useTransition } from "react";
import { Badge } from "@/components/dga";
import {
  createCheckpointAction,
  verifyCheckpointAction,
  type CheckpointActionResult,
} from "@/app/[locale]/admin/audit/actions";

/**
 * Checkpoint controls for the Audit Explorer: take a new chain checkpoint,
 * and verify the chain against the latest one. `latest` is rendered from
 * the server; the buttons revalidate so it refreshes after an action.
 */
export function AuditCheckpointPanel({
  latest,
  labels,
}: {
  latest: { rowCount: number; entryHash: string; takenAt: string } | null;
  labels: {
    none: string;
    lastTitle: string;
    coversRows: string;
    take: string;
    taking: string;
    verify: string;
    verifying: string;
    ok: string;
    failed: string;
  };
}) {
  const [pending, start] = useTransition();
  const [takeResult, setTakeResult] = useState<CheckpointActionResult | null>(
    null,
  );
  const [verifyResult, setVerifyResult] = useState<{
    ok: boolean;
    reason: string | null;
  } | null>(null);

  return (
    <div className="flex flex-col gap-3">
      {latest ? (
        <div className="rounded-md bg-neutral-50 px-3 py-2 text-xs text-neutral-600">
          <span className="font-medium text-neutral-800">{labels.lastTitle}:</span>{" "}
          {labels.coversRows.replace("{n}", String(latest.rowCount))} ·{" "}
          <time dir="ltr">{latest.takenAt}</time> ·{" "}
          <code className="font-mono" dir="ltr">
            {latest.entryHash.slice(0, 16)}…
          </code>
        </div>
      ) : (
        <p className="text-sm text-neutral-500">{labels.none}</p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            start(async () => {
              setVerifyResult(null);
              const r = await createCheckpointAction();
              setTakeResult(r);
            })
          }
          className="inline-flex h-10 items-center justify-center rounded-md bg-primary-600 px-4 text-base font-medium text-white shadow-sm transition-colors hover:bg-primary-700 disabled:bg-neutral-300"
        >
          {pending ? labels.taking : labels.take}
        </button>
        <button
          type="button"
          disabled={pending || !latest}
          onClick={() =>
            start(async () => {
              setTakeResult(null);
              const r = await verifyCheckpointAction();
              setVerifyResult({ ok: r.ok, reason: r.reason });
            })
          }
          className="inline-flex h-10 items-center justify-center rounded-md border border-primary-600 px-4 text-base font-medium text-primary-700 transition-colors hover:bg-primary-50 disabled:opacity-40"
        >
          {pending ? labels.verifying : labels.verify}
        </button>

        {takeResult ? (
          <Badge tone={takeResult.ok ? "success" : "danger"} dot>
            {takeResult.message}
          </Badge>
        ) : null}
        {verifyResult ? (
          verifyResult.ok ? (
            <Badge tone="success" dot>
              {labels.ok}
            </Badge>
          ) : (
            <Badge tone="danger" dot>
              {labels.failed}
              {verifyResult.reason ? `: ${verifyResult.reason}` : ""}
            </Badge>
          )
        ) : null}
      </div>
    </div>
  );
}
