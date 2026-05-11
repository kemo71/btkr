"use client";

import { useActionState, useRef, useEffect } from "react";
import { Field, Input, Select, Badge } from "@/components/dga";
import {
  createByokKeyAction,
  type ActionResult,
} from "@/app/[locale]/admin/byok/actions";

/**
 * BYOK create form.
 *
 * Submits via a server action; on success, clears the plaintext field
 * immediately so the key never lingers in the DOM. The browser's password-
 * manager prompt is suppressed via `autoComplete="off"`.
 */
export function ByokCreateForm({
  labels,
}: {
  labels: {
    provider: string;
    label: string;
    key: string;
    keyHint: string;
    submit: string;
    anthropic: string;
    openai: string;
  };
}) {
  const [state, formAction, isPending] = useActionState<ActionResult | null, FormData>(
    createByokKeyAction,
    null,
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok) {
      formRef.current?.reset();
    }
  }, [state]);

  return (
    <form
      ref={formRef}
      action={formAction}
      autoComplete="off"
      className="grid gap-4 sm:grid-cols-[180px_1fr]"
    >
      <Field label={labels.provider}>
        {(p) => (
          <Select {...p} name="provider" defaultValue="anthropic">
            <option value="anthropic">{labels.anthropic}</option>
            <option value="openai">{labels.openai}</option>
          </Select>
        )}
      </Field>
      <Field label={labels.label}>
        {(p) => <Input {...p} name="label" required maxLength={120} />}
      </Field>
      <Field label={labels.key} hint={labels.keyHint} className="sm:col-span-2">
        {(p) => (
          <Input
            {...p}
            type="password"
            name="plaintext"
            required
            minLength={8}
            spellCheck={false}
            autoComplete="off"
            dir="ltr"
          />
        )}
      </Field>
      <div className="sm:col-span-2 flex items-center justify-end gap-3">
        {state?.message ? (
          <Badge tone={state.ok ? "success" : "danger"}>{state.message}</Badge>
        ) : null}
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex h-10 items-center justify-center rounded-md bg-primary-600 px-4 text-base font-medium text-white shadow-sm transition-colors hover:bg-primary-700 disabled:bg-neutral-300"
        >
          {isPending ? "…" : labels.submit}
        </button>
      </div>
    </form>
  );
}
