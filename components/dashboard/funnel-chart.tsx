import { cn } from "@/lib/cn";
import type { Stage } from "@/lib/lifecycle/stages";
import { stageTone } from "@/lib/lifecycle/stages";

/**
 * Horizontal funnel chart — each row is a stage; bar width is proportional
 * to the max count across all stages. Pure SVG, no chart library, RTL-safe
 * because bars are flexbox children sized in `%` so they grow from the
 * line-start naturally.
 */
export function FunnelChart({
  data,
  stageLabels,
}: {
  data: { stage: Stage; count: number }[];
  stageLabels: Record<Stage, string>;
}) {
  const max = Math.max(1, ...data.map((d) => d.count));

  return (
    <div className="flex flex-col gap-2">
      {data.map(({ stage, count }) => {
        const tone = stageTone(stage);
        const pct = (count / max) * 100;
        return (
          <div key={stage} className="grid grid-cols-[110px_1fr_44px] items-center gap-3">
            <span className="truncate text-sm text-neutral-700">
              {stageLabels[stage]}
            </span>
            <div className="relative h-6 rounded-md bg-neutral-100">
              <div
                aria-hidden
                style={{ width: `${pct}%` }}
                className={cn(
                  "absolute inset-y-0 start-0 rounded-md transition-[width] duration-[var(--duration-slow)]",
                  tone === "primary" && "bg-primary-500",
                  tone === "success" && "bg-success-500",
                  tone === "warning" && "bg-warning-500",
                  tone === "danger" && "bg-danger-500",
                  tone === "info" && "bg-info-500",
                  tone === "neutral" && "bg-neutral-400",
                )}
              />
            </div>
            <span className="text-end text-sm font-medium tabular-nums text-neutral-900">
              {count}
            </span>
          </div>
        );
      })}
    </div>
  );
}
