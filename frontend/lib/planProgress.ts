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
