"use client";

import { useSyncExternalStore } from "react";

const KEY = "lja.session";

export interface Session {
  studentId: string;
  name: string;
  accessToken: string;
}

type Listener = () => void;
const listeners = new Set<Listener>();

function emit() {
  for (const listener of listeners) {
    listener();
  }
}

export function signIn(session: Session): void {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(
    KEY,
    JSON.stringify(session),
  );

  emit();
}

export function signOut(): void {
  if (typeof window === "undefined") return;

  window.localStorage.removeItem(KEY);
  emit();
}

export function getSession(): Session | null {
  if (typeof window === "undefined") return null;

  const stored = window.localStorage.getItem(KEY);

  if (!stored) return null;

  try {
    return JSON.parse(stored) as Session;
  } catch {
    window.localStorage.removeItem(KEY);
    return null;
  }
}

export function getAccessToken(): string | null {
  return getSession()?.accessToken ?? null;
}

export function isSignedIn(): boolean {
  return getSession() !== null;
}

function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  window.addEventListener("storage", listener);

  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

export function useSession(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => isSignedIn(),
    () => false,
  );
}