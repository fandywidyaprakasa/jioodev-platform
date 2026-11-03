"use client";

import { SessionProvider, useSession } from "next-auth/react";
import { useEffect, useRef, type ReactNode } from "react";

function ClaimGuestProjects() {
  const { status } = useSession();
  const done = useRef(false);

  useEffect(() => {
    if (status !== "authenticated" || done.current) return;
    done.current = true;
    fetch("/api/auth/claim", { method: "POST" }).catch(() => undefined);
  }, [status]);

  return null;
}

export function AuthSessionProvider({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <ClaimGuestProjects />
      {children}
    </SessionProvider>
  );
}
