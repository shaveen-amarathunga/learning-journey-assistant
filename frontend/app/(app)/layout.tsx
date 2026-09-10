"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { isSignedIn, useSession } from "@/lib/auth";
import { useHydrated } from "@/lib/useHydrated";
import { AppTopBar } from "@/components/AppTopBar";
import { Spinner } from "@/components/ui/PageState";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const hydrated = useHydrated();
  const signedIn = useSession();

  useEffect(() => {
    // Only decide once we're on the client and can actually read the session.
    if (hydrated && !isSignedIn()) {
      router.replace("/login");
    }
  }, [hydrated, signedIn, router]);

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
      <main className="mx-auto w-full max-w-5xl px-5 pb-24 sm:px-8">
        {children}
      </main>
    </>
  );
}
