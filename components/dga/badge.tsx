import * as React from "react";
import { cn } from "@/lib/cn";

/** Badge tones. Used for lifecycle stages, audit categories, severities. */
export type BadgeTone =
  | "neutral"
  | "primary"
  | "success"
  | "warning"
  | "danger"
  | "info";

const toneClass: Record<BadgeTone, string> = {
  neutral: "bg-neutral-100 text-neutral-800 border-neutral-200",
  primary: "bg-primary-50 text-primary-700 border-primary-200",
  success: "bg-success-500/10 text-success-600 border-success-500/20",
  warning: "bg-warning-500/10 text-warning-600 border-warning-500/20",
  danger: "bg-danger-500/10 text-danger-600 border-danger-500/20",
  info: "bg-info-500/10 text-info-600 border-info-500/20",
};

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
  /** Optional leading dot. Useful for lifecycle stage indicators. */
  dot?: boolean;
}

/**
 * Compact status badge.
 *
 * @example
 * <Badge tone="success" dot>منشورة</Badge>
 *
 * @example
 * <Badge tone="warning">قيد المراجعة</Badge>
 */
export function Badge({
  tone = "neutral",
  dot = false,
  className,
  children,
  ...rest
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        toneClass[tone],
        className,
      )}
      {...rest}
    >
      {dot ? (
        <span
          aria-hidden
          className={cn(
            "size-1.5 rounded-full",
            tone === "neutral" ? "bg-neutral-500" : "bg-current",
          )}
        />
      ) : null}
      {children}
    </span>
  );
}
