"use client";

import { useSyncExternalStore } from "react";

// Prototype-only auth. Real authentication happens against the Application
// Layer's auth service (see design deck, Screen 1). For now we just record a
// flag in localStorage so the routing/guard flow can be built and demoed.

const KEY = "lja.session";

type Listener = () => void;
const listeners = new Set<Listener>();

function emit() {
  for (const l of listeners) l();
}

export function signIn(email: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify({ email, at: Date.now() }));
  emit();
}

export function signOut(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(KEY);
  emit();
}

export function isSignedIn(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(KEY) !== null;
}

function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

/**
 * Reactive sign-in state. Uses useSyncExternalStore so the guard can read
 * localStorage without a setState-in-effect, and stays in sync across tabs.
 */
export function useSession(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => isSignedIn(),
    () => false,
  );
}
