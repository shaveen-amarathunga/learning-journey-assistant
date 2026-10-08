"use client";

// Prototype-only: remember which plan steps the student has ticked off,
// keyed by the step's (deterministic) id. A real backend would own this.

const LEGACY_KEY = "lja.plan.done";
const KEY_PREFIX = "lja.plan.done";

function keyFor(subjectCode: string): string {
  return `${KEY_PREFIX}.${encodeURIComponent(subjectCode.toUpperCase())}`;
}

function parseDoneStepIds(raw: string | null): string[] {
  if (raw === null) return [];

  try {
    const value: unknown = JSON.parse(raw);
    return Array.isArray(value) && value.every((id) => typeof id === "string")
      ? value
      : [];
  } catch {
    return [];
  }
}

export function getDoneStepIds(subjectCode: string): string[] {
  if (typeof window === "undefined") return [];

  const key = keyFor(subjectCode);
  const saved = window.localStorage.getItem(key);
  if (saved !== null) return parseDoneStepIds(saved);

  const selectedSubject =
    window.localStorage.getItem("lja.subjectCode") ?? "CSE3CAP";
  if (selectedSubject.toUpperCase() !== subjectCode.toUpperCase()) return [];

  const legacy = window.localStorage.getItem(LEGACY_KEY);
  if (legacy === null) return [];

  const value = parseDoneStepIds(legacy);
  window.localStorage.setItem(key, JSON.stringify(value));
  window.localStorage.removeItem(LEGACY_KEY);
  return value;
}

export function setStepDone(
  subjectCode: string,
  id: string,
  done: boolean,
): void {
  if (typeof window === "undefined") return;
  const key = keyFor(subjectCode);
  const set = new Set(getDoneStepIds(subjectCode));
  if (done) set.add(id);
  else set.delete(id);
  window.localStorage.setItem(key, JSON.stringify([...set]));
}

export function replaceDoneStepIds(
  subjectCode: string,
  ids: string[],
): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(keyFor(subjectCode), JSON.stringify(ids));
}

export function clearDoneStepIds(subjectCode: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(keyFor(subjectCode));
}
