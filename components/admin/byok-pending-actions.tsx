"use client";

import { useActionState } from "react";
import { Badge } from "@/components/dga";
import {
  approveByokKeyAction,
  rejectByokKeyAction,
  type ActionResult,
} from "@/app/[locale]/admin/byok/actions";

/**
 * Approve / Reject controls for a *pending* BYOK key.
 *
 * `ownedByMe` disables Approve (dual control — the creator can't approve
 * their own submission); the server enforces this too, this is just a hint.
 */
export function ByokPendingActions({
  id,
  ownedByMe,
  labels,
}: {
  id: string;
  ownedByMe: boolean;
  labels: { approve: string; reject: string; ownGuard: string };
}) {
  const [approveState, approveAction, approving] = useActionState<
    ActionResult | null,
    FormData
  >(approveByokKeyAction, null);
  const [, rejectAction, rejecting] = useActionState<ActionResult | null, FormData>(
    rejectByokKeyAction,
    null,
  );

  return (
    <div className="flex items-center gap-2">
      {approveState && !approveState.ok && approveState.message ? (
        <Badge tone="danger">{approveState.message}</Badge>
      ) : null}
      <form action={rejectAction}>
        <input type="hidden" name="id" value={id} />
        <button
          type="submit"
          disabled={rejecting}
          className="inline-flex h-8 items-center rounded-md border border-neutral-300 px-3 text-sm text-neutral-700 transition-colors hover:bg-neutral-50 disabled:opacity-50"
        >
          {rejecting ? "…" : labels.reject}
        </button>
      </form>
      <form action={approveAction} title={ownedByMe ? labels.ownGuard : undefined}>
        <input type="hidden" name="id" value={id} />
        <button
          type="submit"
          disabled={approving || ownedByMe}
          className="inline-flex h-8 items-center rounded-md bg-primary-600 px-3 text-sm font-medium text-white transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:bg-neutral-300"
        >
          {approving ? "…" : labels.approve}
        </button>
      </form>
    </div>
  );
}
