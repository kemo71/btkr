import * as React from "react";
import { cn } from "@/lib/cn";

export interface FieldProps {
  /** Visible label text. */
  label: React.ReactNode;
  /** Optional helper text shown below the input. */
  hint?: React.ReactNode;
  /** Error message — when present, the field renders in error state. */
  error?: React.ReactNode;
  /** Marks the field as required (adds the `*` glyph after the label). */
  required?: boolean;
  /** Optional id; auto-generated if omitted. */
  htmlFor?: string;
  /** The input control. Receives `id` and `aria-describedby` automatically. */
  children: (props: {
    id: string;
    "aria-invalid": boolean | undefined;
    "aria-describedby": string | undefined;
  }) => React.ReactNode;
  className?: string;
}

/**
 * DGA-aligned form field wrapper.
 *
 * Provides label + hint + error in a single accessible primitive. Uses
 * `aria-invalid` and `aria-describedby` so screen readers announce errors
 * and hints. RTL-aware via logical properties; the asterisk glyph for
 * required fields sits at the natural end of the label.
 *
 * @example
 * <Field label="عنوان الفكرة" required hint="حتى 100 حرف" error={errors.title}>
 *   {(p) => <Input {...p} value={title} onChange={...} />}
 * </Field>
 */
export function Field({
  label,
  hint,
  error,
  required,
  htmlFor,
  children,
  className,
}: FieldProps) {
  const reactId = React.useId();
  const id = htmlFor ?? `field-${reactId}`;
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={id} className="text-sm font-medium text-neutral-800">
        {label}
        {required ? (
          <span aria-hidden className="ms-1 text-danger-600">
            *
          </span>
        ) : null}
      </label>

      {children({
        id,
        "aria-invalid": error ? true : undefined,
        "aria-describedby": describedBy,
      })}

      {hint && !error ? (
        <p id={hintId} className="text-xs text-neutral-500">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} role="alert" className="text-xs text-danger-600">
          {error}
        </p>
      ) : null}
    </div>
  );
}
