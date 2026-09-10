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

  const show = hydrated && signedIn;

  return (
    <div className="mx-auto w-full max-w-3xl px-5 pb-20 pt-6 sm:px-6">
      {show ? (
        <>
          <AppTopBar />
          {children}
        </>
      ) : (
        <Spinner label="Loading your journey" />
      )}
    </div>
  );
}
