/**
 * Donut chart — pure SVG, no library.
 *
 * Each slice is a `<circle>` with a `stroke-dasharray` trick: the stroke
 * length equals the slice's proportion of the circumference, and the
 * `stroke-dashoffset` positions it around the ring.
 */
export interface DonutSlice {
  label: string;
  value: number;
  color: string;
}

export function DonutChart({ slices, size = 180 }: { slices: DonutSlice[]; size?: number }) {
  const total = slices.reduce((acc, s) => acc + s.value, 0);
  const radius = (size - 16) / 2;
  const circumference = 2 * Math.PI * radius;

  let offset = 0;
  const items = slices.map((s) => {
    const portion = total === 0 ? 0 : s.value / total;
    const length = circumference * portion;
    const item = (
      <circle
        key={s.label}
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="transparent"
        stroke={s.color}
        strokeWidth={14}
        strokeDasharray={`${length} ${circumference}`}
        strokeDashoffset={-offset}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
    );
    offset += length;
    return item;
  });

  return (
    <div className="flex items-center gap-6">
      <svg width={size} height={size} role="img" aria-label="distribution">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          stroke="var(--color-neutral-100)"
          strokeWidth={14}
        />
        {items}
        <text
          x={size / 2}
          y={size / 2}
          textAnchor="middle"
          dominantBaseline="central"
          className="fill-neutral-900"
          style={{ fontSize: 22, fontWeight: 600 }}
        >
          {total}
        </text>
      </svg>

      <ul className="flex flex-col gap-1.5 text-sm">
        {slices.map((s) => (
          <li key={s.label} className="flex items-center gap-2">
            <span
              aria-hidden
              className="size-3 shrink-0 rounded-sm"
              style={{ backgroundColor: s.color }}
            />
            <span className="text-neutral-700">{s.label}</span>
            <span className="ms-auto tabular-nums text-neutral-500">{s.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
