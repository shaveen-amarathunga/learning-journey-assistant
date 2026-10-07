"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "@/lib/auth";
import { Button } from "@/components/ui/Button";
import { API_BASE_URL } from "@/lib/api";

interface LoginResponse {
  access_token: string;
  student_id: string;
  name: string;
}

export default function LoginPage() {
  const router = useRouter();

  const [studentId, setStudentId] = useState("S001");
  const [password, setPassword] = useState("password123");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    if (!studentId.trim() || !password) return;

    setSubmitting(true);
    setError("");

    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          student_id: studentId.trim(),
          password,
        }),
      });

      if (!response.ok) {
        setError("Invalid student ID or password.");
        return;
      }

      const data = (await response.json()) as LoginResponse;

      signIn({
        studentId: data.student_id,
        name: data.name,
        accessToken: data.access_token,
      });

      router.push("/");
    } catch {
      setError("Unable to connect to the server.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="flex flex-1 items-center justify-center px-5 py-12">
      <div className="w-full max-w-sm">
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-border bg-surface p-8 shadow-[0_1px_3px_rgba(0,0,0,0.06)]"
        >
          <div className="flex flex-col items-center text-center">
            <span
              className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100"
              aria-hidden="true"
            >
              <span className="h-5 w-5 rounded-[5px] border-2 border-blue-600" />
            </span>

            <h1 className="mt-4 text-lg font-semibold text-foreground">
              Learning journey assistant
            </h1>

            <p className="mt-1 text-sm text-muted">
              Sign in to see your progress
            </p>
          </div>

          <div className="mt-6 space-y-4">
            <label className="block">
              <span className="text-sm font-medium text-foreground">
                Student ID
              </span>

              <input
                type="text"
                autoComplete="username"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                className="mt-1.5 h-11 w-full rounded-xl border border-border bg-surface px-3 text-[15px] outline-none focus:border-neutral-400"
                required
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-foreground">
                Password
              </span>

              <input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1.5 h-11 w-full rounded-xl border border-border bg-surface px-3 text-[15px] outline-none focus:border-neutral-400"
                required
              />
            </label>
          </div>

          {error && (
            <p className="mt-4 text-sm text-red-600">
              {error}
            </p>
          )}

          <Button
            type="submit"
            size="lg"
            fullWidth
            className="mt-6"
            disabled={submitting}
          >
            {submitting ? "Signing in…" : "Sign in"}
          </Button>
        </form>

        <p className="mt-4 text-center text-xs text-muted">
          Sign in with your student account.
        </p>
      </div>
    </main>
  );
}