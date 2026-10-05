"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";
import Dashboard from "@/components/Dashboard";
import Login from "@/components/Login";

export type Session = { token: string; studentId: string; name: string };

const STORAGE_KEY = "lja-session";

// Session lives in localStorage; this tiny store lets React subscribe to it.
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

function readSession(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function writeSession(session: Session | null) {
  try {
    if (session) localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Storage unavailable (private mode etc.) — session just won't persist.
  }
  listeners.forEach((l) => l());
}

export default function Home() {
  // `undefined` on the server/prerender, so nothing flashes before we know the session.
  const raw = useSyncExternalStore(subscribe, readSession, () => undefined);

  const session = useMemo<Session | null>(() => {
    if (!raw) return null;
    try {
      return JSON.parse(raw) as Session;
    } catch {
      return null;
    }
  }, [raw]);

  const logout = useCallback(() => writeSession(null), []);

  if (raw === undefined) return null;

  return session ? (
    <Dashboard key={session.studentId} session={session} onLogout={logout} />
  ) : (
    <Login onLogin={writeSession} />
  );
}
