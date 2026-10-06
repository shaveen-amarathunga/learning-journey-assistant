import { readFileSync } from "node:fs";
import path from "node:path";

/**
 * Build-time list of learning-outcome route IDs (lo1, lo2, …) for the static
 * export. Read from the same Moodle fixture the backend seeds its database
 * from, so new outcomes get a page automatically.
 */
export function outcomeStaticParams(): { outcomeId: string }[] {
  try {
    const file = path.join(process.cwd(), "..", "backend", "data", "learning_outcomes.json");
    const outcomes = JSON.parse(readFileSync(file, "utf-8")) as { lo_code: string }[];
    const ids = [...new Set(outcomes.map((lo) => lo.lo_code.toLowerCase()))];
    if (ids.length > 0) return ids.map((outcomeId) => ({ outcomeId }));
  } catch {
    // Fall through to the default set below.
  }
  return ["lo1", "lo2", "lo3", "lo4", "lo5"].map((outcomeId) => ({ outcomeId }));
}
