import * as React from "react";
import { cn } from "@/lib/cn";

export type InputProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "size"
> & {
  /** Visual size variant. Replaces the HTML `size` attribute. */
  size?: "sm" | "md" | "lg";
};

const sizeClass = {
  sm: "h-8 px-2.5 text-sm",
  md: "h-10 px-3 text-base",
  lg: "h-12 px-4 text-lg",
} as const;

/**
 * DGA-aligned text Input.
 *
 * Inherits browser semantics; the `size` prop intentionally shadows the HTML
 * `size` attribute (which is rarely needed and conflicts with our visual
 * scale).
 *
 * @example
 * <Input type="email" placeholder="name@ksaa.gov.sa" />
 */
export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  function Input({ className, size = "md", type = "text", ...rest }, ref) {
    return (
      <input
        ref={ref}
        type={type}
        className={cn(
          "w-full rounded-md border border-neutral-300 bg-white text-neutral-900 placeholder:text-neutral-400",
          "transition-colors duration-[var(--duration-quick)]",
          "focus:border-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-600/20",
          "disabled:cursor-not-allowed disabled:bg-neutral-50 disabled:text-neutral-500",
          "aria-[invalid=true]:border-danger-600 aria-[invalid=true]:focus:ring-danger-600/20",
          sizeClass[size],
          className,
        )}
        {...rest}
      />
    );
  },
);
