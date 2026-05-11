import * as React from "react";
import { cn } from "@/lib/cn";

/**
 * DGA-aligned Textarea.
 *
 * Same styling as `Input` but multi-line. Defaults to 4 rows for typical
 * "describe your idea" usage.
 *
 * @example
 * <Textarea rows={6} placeholder="صف فكرتك بإيجاز…" />
 */
export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea({ className, rows = 4, ...rest }, ref) {
  return (
    <textarea
      ref={ref}
      rows={rows}
      className={cn(
        "w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-base text-neutral-900 placeholder:text-neutral-400",
        "transition-colors duration-[var(--duration-quick)]",
        "focus:border-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-600/20",
        "disabled:cursor-not-allowed disabled:bg-neutral-50 disabled:text-neutral-500",
        "aria-[invalid=true]:border-danger-600 aria-[invalid=true]:focus:ring-danger-600/20",
        "resize-y",
        className,
      )}
      {...rest}
    />
  );
});
