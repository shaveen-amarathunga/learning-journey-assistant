"use client";

// Prototype-only: remember which plan steps the student has ticked off,
// keyed by the step's (deterministic) id. A real backend would own this.

const KEY = "lja.plan.done";

export function getDoneStepIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const value = JSON.parse(window.localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(value) ? (value as string[]) : [];
  } catch {
    return [];
  }
}

export function setStepDone(id: string, done: boolean): void {
  if (typeof window === "undefined") return;
  const set = new Set(getDoneStepIds());
  if (done) set.add(id);
  else set.delete(id);
  window.localStorage.setItem(KEY, JSON.stringify([...set]));
}

// Which version of the plan the student is on. "Regenerate plan" moves to
// the next round, so the plan gets new (unticked) steps instead of the same
// ones. Kept per student and subject.

const ROUND_KEY = "lja.plan.round";

export function getPlanRound(scope: string): number {
  if (typeof window === "undefined") return 0;
  try {
    const value = Number(window.localStorage.getItem(`${ROUND_KEY}.${scope}`));
    return Number.isInteger(value) && value > 0 ? value : 0;
  } catch {
    return 0;
  }
}

export function nextPlanRound(scope: string): number {
  const next = getPlanRound(scope) + 1;
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(`${ROUND_KEY}.${scope}`, String(next));
    } catch {
      // storage blocked: the new round still applies until the page reloads
    }
  }
  return next;
}
