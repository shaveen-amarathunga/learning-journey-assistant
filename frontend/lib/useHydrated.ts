"use client";

import { useSyncExternalStore } from "react";

const emptySubscribe = () => () => {};

/**
 * Returns false during SSR and the first (hydration) render, then true once
 * the client has taken over. Uses useSyncExternalStore so there is no
 * setState-in-effect and no hydration mismatch warning — the canonical
 * "am I on the client yet?" check.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
}
