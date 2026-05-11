import * as React from "react";
import { cn } from "@/lib/cn";

/**
 * DGA-aligned Card surface.
 *
 * A neutral surface for grouping related content. Compose with `CardHeader`,
 * `CardBody`, and `CardFooter` for the standard government-services layout.
 * Logical properties (`ps-`, `pe-`) are used throughout so the card mirrors
 * automatically under RTL.
 *
 * @example
 * <Card>
 *   <CardHeader title="فكرة جديدة" subtitle="قسم الابتكار" />
 *   <CardBody>…</CardBody>
 *   <CardFooter>…</CardFooter>
 * </Card>
 */
export function Card({
  className,
  ...rest
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-lg border border-neutral-200 bg-white shadow-sm",
        "transition-shadow duration-[var(--duration-base)]",
        "hover:shadow-md",
        className,
      )}
      {...rest}
    />
  );
}

export function CardHeader({
  title,
  subtitle,
  action,
  className,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-start justify-between gap-3 border-b border-neutral-100 px-5 py-4",
        className,
      )}
    >
      <div className="min-w-0">
        <h3 className="truncate text-lg font-semibold text-neutral-900">
          {title}
        </h3>
        {subtitle ? (
          <p className="mt-0.5 truncate text-sm text-neutral-500">{subtitle}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function CardBody({
  className,
  ...rest
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("px-5 py-4", className)} {...rest} />;
}

export function CardFooter({
  className,
  ...rest
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-end gap-2 border-t border-neutral-100 px-5 py-3",
        className,
      )}
      {...rest}
    />
  );
}
