"use client";

import { useActionState } from "react";
import {
  voteIdeaAction,
  type ActionResult,
} from "@/app/[locale]/ideas/actions";

/**
 * Up-vote toggle.
 *
 * Phase 1 always submits `action=up` — the store's `castVote` is idempotent
 * via the (idea, user) primary key, so re-submitting is a no-op. The
 * retract path (`action=down`) is wired but currently unused in the UI.
 */
export function VoteButton({
  ideaId,
  count,
  label,
}: {
  ideaId: string;
  count: number;
  label: string;
}) {
  const [, formAction, isPending] = useActionState<ActionResult | null, FormData>(
    voteIdeaAction,
    null,
  );

  return (
    <form action={formAction} className="inline-flex">
      <input type="hidden" name="ideaId" value={ideaId} />
      <input type="hidden" name="action" value="up" />
      <button
        type="submit"
        disabled={isPending}
        aria-label={label}
        className="inline-flex items-center gap-1.5 rounded-full border border-primary-200 bg-primary-50 px-3 py-1 text-sm font-medium text-primary-700 transition-colors hover:bg-primary-100 disabled:opacity-50"
      >
        <span aria-hidden>▲</span>
        <span className="tabular-nums">{count}</span>
      </button>
    </form>
  );
}
