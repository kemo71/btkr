/* eslint-disable @next/next/no-img-element */
import { cn } from "@/lib/cn";

/**
 * Brand mark — renders the KSAA logo lockup or square mark.
 *
 * Currently points at the **placeholder** SVGs in `public/brand/`. When the
 * official KSAA assets land, swap the files (or the `src` here) — this is the
 * single integration point for the brand image. See `public/brand/README.md`.
 *
 * Plain `<img>` (not `next/image`) is intentional: the asset is a tiny static
 * SVG; `next/image` adds no value and complicates the swap.
 *
 * @example
 * <BrandMark variant="lockup" className="h-8 w-auto" />
 * <BrandMark variant="icon" className="size-8" />
 */
export function BrandMark({
  variant = "lockup",
  className,
}: {
  variant?: "lockup" | "icon";
  className?: string;
}) {
  const src =
    variant === "icon"
      ? "/brand/icon-placeholder.svg"
      : "/brand/logo-placeholder.svg";
  return (
    <img
      src={src}
      alt="وادي بتكر — Btkr Valley"
      className={cn(variant === "icon" ? "size-9" : "h-9 w-auto", className)}
    />
  );
}
