"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { isSignedIn, useSession } from "@/lib/auth";
import { useHydrated } from "@/lib/useHydrated";
import { AppTopBar } from "@/components/AppTopBar";
import { Spinner } from "@/components/ui/PageState";
import { cn } from "@/lib/cn";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const hydrated = useHydrated();
  const signedIn = useSession();

  useEffect(() => {
    // Only decide once we're on the client and can actually read the session.
    if (hydrated && !isSignedIn()) {
      router.replace("/login");
    }
  }, [hydrated, signedIn, router]);

  // The dashboard is a wide two-column layout; the other screens are a single
  // reading column and look better narrower.
  const widthClass =
    pathname === "/"
      ? "max-w-5xl"
      : pathname.startsWith("/quiz")
        ? "max-w-2xl"
        : "max-w-3xl";

  if (!(hydrated && signedIn)) {
    return (
      <div className="mx-auto w-full max-w-5xl px-5 pt-16 sm:px-8">
        <Spinner label="Loading your journey" />
      </div>
    );
  }

  return (
    <>
      <AppTopBar />
      <main
        className={cn("mx-auto w-full px-5 pb-24 sm:px-8", widthClass)}
      >
        {children}
      </main>
    </>
  );
}
