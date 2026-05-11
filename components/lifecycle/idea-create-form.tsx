"use client";

import { useActionState } from "react";
import { Field, Input, Select, Textarea, Badge } from "@/components/dga";
import {
  createIdeaAction,
  type ActionResult,
} from "@/app/[locale]/ideas/actions";
import type { FrameworkSlug } from "@/lib/frameworks";

/**
 * New-idea form.
 *
 * Bound to `createIdeaAction`; on success the action redirects to the
 * created idea's detail page, so this component never sees a success state
 * locally — only errors surface as a Badge.
 */
export function IdeaCreateForm({
  frameworks,
  labels,
}: {
  frameworks: { slug: FrameworkSlug; label: string }[];
  labels: {
    titleAr: string;
    titleEn: string;
    summaryAr: string;
    body: string;
    department: string;
    innovationType: string;
    framework: string;
    frameworkNone: string;
    innovationTypeIncremental: string;
    innovationTypeAdjacent: string;
    innovationTypeDisruptive: string;
    submit: string;
  };
}) {
  const [state, formAction, isPending] = useActionState<ActionResult | null, FormData>(
    createIdeaAction,
    null,
  );

  return (
    <form action={formAction} className="grid gap-4">
      <Field label={labels.titleAr} required>
        {(p) => <Input {...p} name="titleAr" required minLength={3} maxLength={200} />}
      </Field>
      <Field label={labels.titleEn}>
        {(p) => <Input {...p} name="titleEn" maxLength={200} dir="ltr" />}
      </Field>
      <Field label={labels.summaryAr}>
        {(p) => <Textarea {...p} name="summaryAr" rows={3} maxLength={1000} />}
      </Field>
      <Field label={labels.body}>
        {(p) => <Textarea {...p} name="body" rows={8} maxLength={20000} />}
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={labels.department}>
          {(p) => <Input {...p} name="department" maxLength={120} />}
        </Field>
        <Field label={labels.innovationType} required>
          {(p) => (
            <Select {...p} name="innovationType" defaultValue="incremental" required>
              <option value="incremental">{labels.innovationTypeIncremental}</option>
              <option value="adjacent">{labels.innovationTypeAdjacent}</option>
              <option value="disruptive">{labels.innovationTypeDisruptive}</option>
            </Select>
          )}
        </Field>
      </div>
      <Field label={labels.framework}>
        {(p) => (
          <Select {...p} name="framework" defaultValue="">
            <option value="">{labels.frameworkNone}</option>
            {frameworks.map((f) => (
              <option key={f.slug} value={f.slug}>
                {f.label}
              </option>
            ))}
          </Select>
        )}
      </Field>
      <div className="flex items-center justify-end gap-3">
        {state && !state.ok && state.message ? (
          <Badge tone="danger">{state.message}</Badge>
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
