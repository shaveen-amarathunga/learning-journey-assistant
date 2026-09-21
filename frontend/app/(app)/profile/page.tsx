"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { fetchDashboard, fetchStudent } from "@/lib/api";
import { signOut } from "@/lib/auth";

import type { DashboardData, Student } from "@/lib/types";

export default function ProfilePage() {
  const router = useRouter();

  const [student, setStudent] = useState<Student | null>(null);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadProfile() {
      try {
        const [studentData, dashboardData] = await Promise.all([
          fetchStudent(),
          fetchDashboard(),
        ]);

        if (!active) return;

        setStudent(studentData);
        setDashboard(dashboardData);
      } catch (err) {
        console.error(err);

        if (active) {
          setError("We couldn't load your profile.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadProfile();

    return () => {
      active = false;
    };
  }, []);

  function handleSignOut() {
    signOut();
    router.replace("/login");
  }

  if (loading) {
    return (
      <main className="mx-auto w-full max-w-4xl px-6 py-10">
        <p className="text-sm text-muted">Loading profile…</p>
      </main>
    );
  }

  if (error || !student || !dashboard) {
    return (
      <main className="mx-auto w-full max-w-4xl px-6 py-10">
        <div className="rounded-2xl border border-border bg-surface p-6">
          <h1 className="text-xl font-semibold text-foreground">
            Student profile
          </h1>

          <p className="mt-2 text-sm text-muted">
            {error ?? "Profile information is unavailable."}
          </p>

          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Try again
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-10">
      <button
        type="button"
        onClick={() => router.push("/")}
        className="mb-6 text-sm font-medium text-blue-600 hover:text-blue-700"
      >
        ← Back to dashboard
      </button>

      <section className="overflow-hidden rounded-2xl border border-border bg-surface">
        <div className="border-b border-border px-6 py-7 sm:px-8">
          <div className="flex items-center gap-5">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-blue-100 text-lg font-bold text-blue-700">
              {student.initials}
            </div>

            <div>
              <p className="text-sm font-medium text-muted">Student profile</p>

              <h1 className="mt-1 text-2xl font-bold text-foreground">
                {student.name}
              </h1>

              <p className="mt-1 text-sm text-muted">{student.email}</p>
            </div>
          </div>
        </div>

        <div className="grid gap-8 px-6 py-7 sm:px-8 lg:grid-cols-2">
          <div>
            <h2 className="text-base font-semibold text-foreground">
              Academic information
            </h2>

            <dl className="mt-4 divide-y divide-border rounded-xl border border-border">
              <ProfileRow label="Student ID" value={student.id} />

              <ProfileRow
                label="Subject code"
                value={student.subjectCode}
              />

              <ProfileRow
                label="Subject"
                value={student.subjectName}
              />
            </dl>
          </div>

          <div>
            <h2 className="text-base font-semibold text-foreground">
              Learning progress
            </h2>

            <dl className="mt-4 divide-y divide-border rounded-xl border border-border">
              <ProfileRow
                label="Overall mastery"
                value={`${Math.round(dashboard.overallMastery)}%`}
              />

              <ProfileRow
                label="Learning outcomes tracked"
                value={String(dashboard.outcomesTracked)}
              />

              <ProfileRow
                label="Practice quizzes completed"
                value={String(dashboard.quizzesCompleted)}
              />
            </dl>
          </div>
        </div>

        <div className="border-t border-border px-6 py-6 sm:px-8">
          <h2 className="text-base font-semibold text-foreground">Account</h2>

          <p className="mt-1 text-sm text-muted">
            Signed in as {student.email}
          </p>

          <button
            type="button"
            onClick={handleSignOut}
            className="mt-5 rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-status-low hover:bg-red-50"
          >
            Sign out
          </button>
        </div>
      </section>
    </main>
  );
}

function ProfileRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start justify-between gap-6 px-4 py-3.5">
      <dt className="text-sm text-muted">{label}</dt>

      <dd className="max-w-[60%] text-right text-sm font-medium text-foreground">
        {value}
      </dd>
    </div>
  );
}