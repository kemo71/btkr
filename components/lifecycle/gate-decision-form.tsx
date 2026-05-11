"use client";

import { useActionState, useState } from "react";
import { Field, Select, Textarea, Badge } from "@/components/dga";
import {
  transitionStageAction,
  type ActionResult,
} from "@/app/[locale]/ideas/actions";
import type { Stage } from "@/lib/lifecycle/stages";

/**
 * Gate-decision form.
 *
 * Stakeholders pick a forward stage from the FSM-derived `forward` list,
 * record a rationale (required, audit trail), and submit Approve or Reject.
 * The action writes the lifecycle event and an audit row.
 */
export function GateDecisionForm({
  ideaId,
  from,
  forward,
  labels,
}: {
  ideaId: string;
  from: Stage;
  forward: readonly Stage[];
  labels: {
    rationale: string;
    approve: string;
    reject: string;
    nextStage: string;
    stageNames: Record<Stage, string>;
  };
}) {
  const [state, formAction, isPending] = useActionState<ActionResult | null, FormData>(
    transitionStageAction,
    null,
  );
  const [to, setTo] = useState<Stage>(forward[0]);

  function submitWith(decision: "approve" | "reject") {
    return (e: React.FormEvent<HTMLFormElement>) => {
      const target = e.currentTarget;
      (target.elements.namedItem("decision") as HTMLInputElement).value = decision;
      // The default submit is allowed; just set the hidden field before it.
    };
  }

  return (
    <form action={formAction} className="grid gap-4">
      <input type="hidden" name="ideaId" value={ideaId} />
      <input type="hidden" name="from" value={from} />
      <input type="hidden" name="decision" value="approve" />
      <Field label={labels.nextStage} required>
        {(p) => (
          <Select
            {...p}
            name="to"
            value={to}
            onChange={(e) => setTo(e.target.value as Stage)}
          >
            {forward.map((s) => (
              <option key={s} value={s}>
                {labels.stageNames[s]}
              </option>
            ))}
          </Select>
        )}
      </Field>
      <Field label={labels.rationale} required>
        {(p) => (
          <Textarea {...p} name="rationale" required minLength={3} maxLength={2000} rows={3} />
        )}
      </Field>
      <div className="flex flex-wrap items-center justify-end gap-3">
        {state && !state.ok && state.message ? (
          <Badge tone="danger">{state.message}</Badge>
        ) : null}
        <button
          type="submit"
          disabled={isPending}
          onClick={(e) => {
            const form = (e.currentTarget as HTMLButtonElement).form;
            if (form) (form.elements.namedItem("decision") as HTMLInputElement).value = "reject";
          }}
          className="inline-flex h-10 items-center justify-center rounded-md border border-danger-500/30 px-4 text-base font-medium text-danger-600 transition-colors hover:bg-danger-500/10 disabled:opacity-50"
        >
          {labels.reject}
        </button>
        <button
          type="submit"
          disabled={isPending}
          onClick={(e) => {
            const form = (e.currentTarget as HTMLButtonElement).form;
            if (form) (form.elements.namedItem("decision") as HTMLInputElement).value = "approve";
          }}
          className="inline-flex h-10 items-center justify-center rounded-md bg-primary-600 px-4 text-base font-medium text-white shadow-sm transition-colors hover:bg-primary-700 disabled:bg-neutral-300"
        >
          {isPending ? "…" : labels.approve}
        </button>
      </div>
    </form>
  );
}
