"use client";

import { useSyncExternalStore } from "react";
import type { PlanStep } from "./types";

// Prototype-only store for the student's "what will I do differently?"
// reflections. Persisted in localStorage so they survive a reload and can be
// merged into the learning plan. A real backend endpoint would replace this.

const KEY = "lja.reflections";
const EMPTY: Reflection[] = [];

export interface Reflection {
  id: string;
  outcomeId: string;
  outcomeLabel: string; // short, e.g. "LO3"
  text: string;
  createdAt: number;
}

function readStorage(): Reflection[] {
  if (typeof window === "undefined") return EMPTY;
  try {
    const parsed = JSON.parse(window.localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(parsed) ? (parsed as Reflection[]) : EMPTY;
  } catch {
    return EMPTY;
  }
}

// Cached so useSyncExternalStore gets a stable reference between changes.
let cache: Reflection[] = readStorage();
const listeners = new Set<() => void>();

function refresh() {
  cache = readStorage();
  for (const listener of listeners) listener();
}

export function getReflections(): Reflection[] {
  return cache;
}

export function addReflection(
  outcomeId: string,
  outcomeLabel: string,
  text: string,
): void {
  if (typeof window === "undefined") return;
  const next: Reflection[] = [
    ...cache,
    {
      id: `refl-${Date.now()}`,
      outcomeId,
      outcomeLabel,
      text: text.trim(),
      createdAt: Date.now(),
    },
  ];
  window.localStorage.setItem(KEY, JSON.stringify(next));
  refresh();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  window.addEventListener("storage", refresh);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", refresh);
  };
}

export function useReflections(): Reflection[] {
  return useSyncExternalStore(subscribe, getReflections, () => EMPTY);
}

/** Reflections as learning-plan steps, newest first. */
export function reflectionSteps(): PlanStep[] {
  return [...cache].reverse().map((r) => ({
    id: r.id,
    title: r.text,
    estMinutes: 0,
    targetOutcomeName: r.outcomeLabel,
    status: "todo" as const,
    origin: "reflection" as const,
  }));
}
