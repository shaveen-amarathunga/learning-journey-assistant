"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { fetchStudent } from "@/lib/api";
import { signOut } from "@/lib/auth";
import type { Student } from "@/lib/types";
import { cn } from "@/lib/cn";

/**
 * Avatar button that opens a small menu with the signed-in student's details
 * and a Sign out action. Used in the dashboard header and the app top bar.
 */
export function AccountMenu({
  size = "md",
  align = "right",
}: {
  size?: "sm" | "md";
  align?: "left" | "right";
}) {
  const router = useRouter();
  const [student, setStudent] = useState<Student | null>(null);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    fetchStudent().then((s) => {
      if (active) setStudent(s);
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  function handleSignOut() {
    signOut();
    router.replace("/login");
  }

  const avatarSize = size === "sm" ? "h-9 w-9 text-xs" : "h-11 w-11 text-sm";

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
        className={cn(
          "flex items-center justify-center rounded-full bg-blue-100 font-semibold text-blue-700 transition-shadow hover:ring-2 hover:ring-blue-200",
          avatarSize,
        )}
      >
        {student?.initials ?? "…"}
      </button>

      {open ? (
        <div
          role="menu"
          className={cn(
            "absolute top-full z-20 mt-2 w-60 overflow-hidden rounded-xl border border-border bg-surface shadow-lg",
            align === "right" ? "right-0" : "left-0",
          )}
        >
          <div className="border-b border-border px-4 py-3">
            <p className="text-sm font-semibold text-foreground">
              {student?.name ?? "Student"}
            </p>
            <p className="mt-0.5 truncate text-xs text-muted">
              {student?.email ?? ""}
            </p>
          </div>
          <button
            type="button"
            role="menuitem"
            onClick={handleSignOut}
            className="w-full px-4 py-2.5 text-left text-sm font-medium text-status-low hover:bg-neutral-50"
          >
            Sign out
          </button>
        </div>
      ) : null}
    </div>
  );
}
