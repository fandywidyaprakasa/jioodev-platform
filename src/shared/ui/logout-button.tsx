"use client";

import { LogOut } from "lucide-react";
import { signOut } from "next-auth/react";

export function LogoutButton() {
  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: "/login" })}
      className="inline-flex min-h-11 items-center gap-2 rounded-full border border-line px-3.5 text-sm text-muted transition-colors duration-150 hover:border-ink/30 hover:text-ink"
    >
      <LogOut className="h-4 w-4" aria-hidden="true" />
      Keluar
    </button>
  );
}
