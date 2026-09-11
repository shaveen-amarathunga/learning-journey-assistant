import { masteryColor } from "@/lib/format";

/**
 * Tiny inline line chart. Stretches to fill its className box; stroke width
 * stays constant thanks to non-scaling-stroke.
 */
export function Sparkline({
  points,
  className,
}: {
  points: number[];
  className?: string;
}) {
  if (points.length < 2) return null;

  const w = 100;
  const h = 32;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = max - min || 1;

  const d = points
    .map((p, i) => {
      const x = (i / (points.length - 1)) * w;
      const y = h - ((p - min) / span) * (h - 4) - 2;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className={className}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <path
        d={d}
        fill="none"
        stroke={masteryColor(points[points.length - 1])}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
