import type { MasteryStatus } from "./types";

/** Red / amber / green banding used across the dashboard and detail screens. */
export function masteryStatus(mastery: number): MasteryStatus {
  if (mastery < 50) return "low";
  if (mastery < 75) return "mid";
  return "high";
}

/** Tailwind text colour class for a mastery value. */
export function masteryTextClass(mastery: number): string {
  return {
    low: "text-status-low",
    mid: "text-status-mid",
    high: "text-status-high",
  }[masteryStatus(mastery)];
}

/** Hex colour for a mastery value (for the SVG progress bars and charts). */
export function masteryColor(mastery: number): string {
  return {
    low: "var(--status-low)",
    mid: "var(--status-mid)",
    high: "var(--status-high)",
  }[masteryStatus(mastery)];
}

export function formatDelta(delta: number): string {
  if (delta === 0) return "0%";
  return `${delta > 0 ? "+" : ""}${delta}%`;
}

/** Short text label for a mastery band — a non-colour cue for the bars. */
export function masteryLabel(mastery: number): string {
  return {
    low: "needs work",
    mid: "developing",
    high: "on track",
  }[masteryStatus(mastery)];
}
