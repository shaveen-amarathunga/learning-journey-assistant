"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "@/lib/auth";
import { Button } from "@/components/ui/Button";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("aisha.khan@students.latrobe.edu.au");
  const [password, setPassword] = useState("password");
  const [submitting, setSubmitting] = useState(false);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!email.trim()) return;
    setSubmitting(true);
    // Prototype: no real auth call yet — see lib/auth.ts.
    signIn(email.trim());
    router.push("/");
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
            <p className="mt-1 text-sm text-muted">Sign in to see your progress</p>
          </div>

          <div className="mt-6 space-y-4">
            <label className="block">
              <span className="text-sm font-medium text-foreground">
                Student email
              </span>
              <input
                type="email"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1.5 h-11 w-full rounded-xl border border-border bg-surface px-3 text-[15px] outline-none focus:border-neutral-400"
                required
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-foreground">Password</span>
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

          <Button
            type="submit"
            size="lg"
            fullWidth
            className="mt-6"
            disabled={submitting}
          >
            {submitting ? "Signing in…" : "Sign in"}
          </Button>

          <button
            type="button"
            onClick={handleSubmit}
            className="mt-4 w-full text-center text-sm text-muted hover:text-foreground"
          >
            Or continue with La Trobe SSO
          </button>
        </form>

        <p className="mt-4 text-center text-xs text-muted">
          Prototype — any email signs you in as the demo student.
        </p>
      </div>
    </main>
  );
}
