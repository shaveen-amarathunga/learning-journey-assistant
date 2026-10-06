"use client";

import { useSyncExternalStore } from "react";

// Authentication against the backend's /api/auth/login endpoint.
// The session (JWT + student) is kept in localStorage so the routing guard
// and the API layer can both read it.

const KEY = "lja.session";

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:5001/api";

export interface Session {
  token: string;
  studentId: string;
  name: string;
  email: string;
}

type Listener = () => void;
const listeners = new Set<Listener>();

function emit() {
  for (const l of listeners) l();
}

export async function signIn(email: string, password: string): Promise<void> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
  } catch {
    throw new Error("Can't reach the server. Check your connection and try again.");
  }

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      res.status === 401 ? "Incorrect email or password." : body.error ?? "Sign in failed.",
    );
  }

  const session: Session = {
    token: body.access_token,
    studentId: body.student_id,
    name: body.name,
    email,
  };
  window.localStorage.setItem(KEY, JSON.stringify(session));
  emit();
}

export function signOut(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(KEY);
  emit();
}

export function getSession(): Session | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    const session = raw ? (JSON.parse(raw) as Session) : null;
    return session?.token ? session : null;
  } catch {
    return null;
  }
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
