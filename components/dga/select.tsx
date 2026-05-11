import * as React from "react";
import { cn } from "@/lib/cn";

/**
 * DGA-aligned Select.
 *
 * Uses the native `<select>` element for accessibility and OS-level locale
 * support. Custom dropdowns can be added later in a `components/dga/combobox`
 * if multi-select / typeahead / large lists are required.
 *
 * @example
 * <Select>
 *   <option value="incremental">ابتكار تدريجي</option>
 *   <option value="adjacent">ابتكار متاخم</option>
 *   <option value="disruptive">ابتكار جذري</option>
 * </Select>
 */
export const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(function Select({ className, children, ...rest }, ref) {
  return (
    <select
      ref={ref}
      className={cn(
        "h-10 w-full rounded-md border border-neutral-300 bg-white px-3 text-base text-neutral-900",
        "transition-colors duration-[var(--duration-quick)]",
        "focus:border-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-600/20",
        "disabled:cursor-not-allowed disabled:bg-neutral-50 disabled:text-neutral-500",
        "aria-[invalid=true]:border-danger-600 aria-[invalid=true]:focus:ring-danger-600/20",
        className,
      )}
      {...rest}
    >
      {children}
    </select>
  );
});
