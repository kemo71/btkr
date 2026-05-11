"use client";

import { useActionState } from "react";
import { Field, Input, Badge } from "@/components/dga";

interface MfaResult {
  ok: boolean;
  message?: string;
}

/**
 * Shared MFA code-entry form — used for both enrollment confirmation and
 * login-time verification. Binds to whichever server action is passed.
 */
export function MfaCodeForm({
  action,
  label,
  submitLabel,
}: {
  action: (
    prev: MfaResult | null,
    formData: FormData,
  ) => Promise<MfaResult>;
  label: string;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState<MfaResult | null, FormData>(
    action,
    null,
  );

  return (
    <form action={formAction} className="flex flex-col gap-3" autoComplete="off">
      <Field label={label} error={state && !state.ok ? state.message : undefined}>
        {(p) => (
          <Input
            {...p}
            name="code"
            inputMode="text"
            autoComplete="one-time-code"
            spellCheck={false}
            dir="ltr"
            className="text-center font-mono tracking-widest"
            required
            minLength={6}
            maxLength={20}
            placeholder="••••••"
          />
        )}
      </Field>
      <div className="flex items-center justify-end gap-3">
        {state?.ok ? <Badge tone="success">OK</Badge> : null}
        <button
          type="submit"
          disabled={pending}
          className="inline-flex h-10 items-center justify-center rounded-md bg-primary-600 px-4 text-base font-medium text-white shadow-sm transition-colors hover:bg-primary-700 disabled:bg-neutral-300"
        >
          {pending ? "…" : submitLabel}
        </button>
      </div>
    </form>
  );
}
