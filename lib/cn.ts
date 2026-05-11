/**
 * Minimal class-name joiner.
 *
 * Filters out falsy values and joins with a space. Intentionally tiny — we
 * don't pull in `clsx` / `tailwind-merge` here to keep the dependency
 * footprint minimal. If class conflicts become a maintenance issue later,
 * graduate to `tailwind-merge` then.
 *
 * @example
 * cn("rounded", isActive && "bg-primary-600", className)
 */
export type ClassValue = string | false | null | undefined;

export function cn(...classes: ClassValue[]): string {
  return classes.filter(Boolean).join(" ");
}
