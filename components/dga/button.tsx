import * as React from "react";
import { cn } from "@/lib/cn";

/** DGA-aligned button variants. */
export type ButtonVariant =
  | "primary"
  | "secondary"
  | "tertiary"
  | "ghost"
  | "danger";

/** Button sizes. `md` is the default. */
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** When true, renders a spinner and disables the button. */
  loading?: boolean;
}

const variantClass: Record<ButtonVariant, string> = {
  primary:
    "bg-primary-600 text-white hover:bg-primary-700 active:bg-primary-800 disabled:bg-neutral-300",
  secondary:
    "bg-neutral-900 text-white hover:bg-neutral-800 active:bg-neutral-950 disabled:bg-neutral-300",
  tertiary:
    "bg-transparent border border-primary-600 text-primary-700 hover:bg-primary-50 active:bg-primary-100 disabled:border-neutral-300 disabled:text-neutral-400",
  ghost:
    "bg-transparent text-neutral-800 hover:bg-neutral-100 active:bg-neutral-200 disabled:text-neutral-400",
  danger:
    "bg-danger-600 text-white hover:bg-danger-500 active:bg-danger-600 disabled:bg-neutral-300",
};

const sizeClass: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-sm rounded-md gap-1.5",
  md: "h-10 px-4 text-base rounded-md gap-2",
  lg: "h-12 px-5 text-lg rounded-lg gap-2",
};

/**
 * DGA-aligned Button primitive.
 *
 * Variants follow Saudi government UI conventions: solid primary (Saudi
 * green), neutral secondary, outlined tertiary, ghost, and destructive.
 * Sizes are tuned for both Arabic and Latin scripts.
 *
 * Renders an HTML `<button>` — for navigation, use `next/link`'s `Link` with
 * `className={buttonClass(...)}` instead, or wrap a `<Link>` with this
 * component using `asChild` (pattern added in a later slice if needed).
 *
 * @example
 * <Button variant="primary" size="lg">إرسال فكرة</Button>
 *
 * @example
 * <Button variant="tertiary" loading>حفظ</Button>
 */
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      variant = "primary",
      size = "md",
      loading = false,
      disabled,
      className,
      children,
      ...rest
    },
    ref,
  ) {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        className={cn(
          "inline-flex items-center justify-center font-medium transition-colors",
          "duration-[var(--duration-base)] ease-[var(--ease-out-quart)]",
          "disabled:cursor-not-allowed",
          variantClass[variant],
          sizeClass[size],
          className,
        )}
        {...rest}
      >
        {loading ? (
          <span
            aria-hidden
            className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent"
          />
        ) : null}
        {children}
      </button>
    );
  },
);
