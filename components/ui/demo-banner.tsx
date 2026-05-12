import { isDemoMode } from "@/lib/auth/demo";

/**
 * Sticky "DEMO MODE" banner. Renders nothing unless `BTKR_DEMO_MODE=1`.
 *
 * Mounted in the locale layout so it shows on every page — makes it
 * impossible to mistake the demo deployment for a real one.
 *
 * @see lib/auth/demo.ts
 */
export function DemoBanner() {
  if (!isDemoMode()) return null;
  return (
    <div
      role="status"
      className="sticky top-0 z-50 flex items-center justify-center gap-2 bg-warning-500 px-4 py-1.5 text-center text-xs font-medium text-neutral-950"
    >
      <span aria-hidden>⚠</span>
      <span>
        وضع العرض التجريبي · DEMO MODE — البيانات عامة وقد تُعاد تهيئتها · data
        is public and may be reset
      </span>
    </div>
  );
}
