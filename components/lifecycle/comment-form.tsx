"use client";

import { useActionState, useRef, useEffect } from "react";
import { Textarea, Badge } from "@/components/dga";
import {
  commentOnIdeaAction,
  type ActionResult,
} from "@/app/[locale]/ideas/actions";

/**
 * Add-a-comment form for an idea. Submits via the server action; on success
 * the action revalidates the page (so the new comment appears) and we clear
 * the textarea.
 */
export function CommentForm({
  ideaId,
  labels,
}: {
  ideaId: string;
  labels: { placeholder: string; submit: string; sending: string };
}) {
  const [state, formAction, pending] = useActionState<ActionResult | null, FormData>(
    commentOnIdeaAction,
    null,
  );
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (state?.ok && ref.current) ref.current.value = "";
  }, [state]);

  return (
    <form action={formAction} className="flex flex-col gap-2">
      <input type="hidden" name="ideaId" value={ideaId} />
      <Textarea
        ref={ref}
        name="body"
        rows={3}
        required
        minLength={1}
        maxLength={4000}
        placeholder={labels.placeholder}
      />
      <div className="flex items-center justify-end gap-3">
        {state && !state.ok && state.message ? (
          <Badge tone="danger">{state.message}</Badge>
        ) : null}
        <button
          type="submit"
          disabled={pending}
          className="inline-flex h-9 items-center justify-center rounded-md bg-primary-600 px-4 text-sm font-medium text-white shadow-sm transition-colors hover:bg-primary-700 disabled:bg-neutral-300"
        >
          {pending ? labels.sending : labels.submit}
        </button>
      </div>
    </form>
  );
}
