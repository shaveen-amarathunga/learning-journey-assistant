"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { isSignedIn, useSession } from "@/lib/auth";
import { useHydrated } from "@/lib/useHydrated";
import { AccountMenu } from "@/components/AccountMenu";
import { Spinner } from "@/components/ui/PageState";

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

  const show = hydrated && signedIn;
  // The dashboard has its own header with the account menu, so the shared
  // top bar only appears on the other screens.
  const showTopBar = show && pathname !== "/";

  return (
    <div className="mx-auto w-full max-w-3xl px-5 pb-20 pt-6 sm:px-6">
      {showTopBar ? (
        <div className="mb-5 flex items-center justify-between">
          <Link
            href="/"
            className="text-sm font-semibold tracking-tight text-foreground"
          >
            Learning Journey Assistant
          </Link>
          <AccountMenu size="sm" />
        </div>
      ) : null}

      {show ? children : <Spinner label="Loading your journey" />}
    </div>
  );
}
