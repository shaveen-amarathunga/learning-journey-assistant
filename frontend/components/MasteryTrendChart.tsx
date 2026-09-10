"use client";

import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { TrendPoint } from "@/lib/types";

/**
 * Line chart of a single outcome's mastery across assessments (Screen 5).
 * Deliberately minimal: no gridlines, no Y axis — the design shows just the
 * line and the assessment labels underneath.
 */
export function MasteryTrendChart({ series }: { series: TrendPoint[] }) {
  return (
    <div className="h-44 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={series}
          margin={{ top: 12, right: 8, bottom: 4, left: 8 }}
        >
          <YAxis hide domain={[0, 100]} />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            tick={{ fill: "var(--muted)", fontSize: 12 }}
            interval={0}
            padding={{ left: 32, right: 32 }}
            height={20}
          />
          <Tooltip
            cursor={{ stroke: "var(--border)" }}
            contentStyle={{
              borderRadius: 12,
              border: "1px solid var(--border)",
              fontSize: 13,
            }}
            labelFormatter={(_label, payload) =>
              (payload?.[0]?.payload as { label?: string })?.label ?? ""
            }
            formatter={(value) => [`${value}%`, "Mastery"] as [string, string]}
          />
          <Line
            type="linear"
            dataKey="value"
            stroke="#2563eb"
            strokeWidth={2.5}
            dot={{ r: 4, fill: "#2563eb", strokeWidth: 0 }}
            activeDot={{ r: 5 }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
