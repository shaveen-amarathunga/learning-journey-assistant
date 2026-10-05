"use client";

import { FormEvent, useEffect, useState } from "react";
import { api, StudentSummary } from "@/lib/api";
import type { Session } from "@/app/page";

export default function Login({ onLogin }: { onLogin: (s: Session) => void }) {
  const [students, setStudents] = useState<StudentSummary[]>([]);
  const [studentId, setStudentId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [slow, setSlow] = useState(false);

  // Loading the student list also wakes the free-tier backend early.
  useEffect(() => {
    const timer = setTimeout(() => setSlow(true), 4000);
    api
      .students()
      .then((list) => {
        setStudents(list);
        if (list.length) setStudentId((id) => id || list[0].id);
      })
      .catch(() => {})
      .finally(() => {
        clearTimeout(timer);
        setSlow(false);
      });
    return () => clearTimeout(timer);
  }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const res = await api.login(studentId.trim(), password);
      onLogin({ token: res.access_token, studentId: res.student_id, name: res.name });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-xl font-bold text-white">
            LJ
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Learning Journey Assistant</h1>
          <p className="mt-2 text-sm text-muted">
            See your mastery of each learning outcome and what to work on next.
          </p>
        </div>

        <form onSubmit={submit} className="card space-y-4 p-6">
          <label className="block">
            <span className="mb-1 block text-sm font-medium">Student</span>
            {students.length ? (
              <select
                className="input"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
              >
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.id})
                  </option>
                ))}
              </select>
            ) : (
              <input
                className="input"
                placeholder="e.g. S001"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                required
              />
            )}
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium">Password</span>
            <input
              className="input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </label>

          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

          <button type="submit" className="btn-primary w-full" disabled={busy || !studentId}>
            {busy ? "Signing in…" : "Sign in"}
          </button>

          <p className="text-center text-xs text-muted">
            Demo accounts use the password <code className="font-mono">password123</code>
          </p>
        </form>

        {slow && (
          <p className="mt-4 text-center text-xs text-muted">
            Waking up the server — the first request can take up to a minute.
          </p>
        )}
      </div>
    </main>
  );
}
