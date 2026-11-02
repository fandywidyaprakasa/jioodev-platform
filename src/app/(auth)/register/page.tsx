"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";

export default function RegisterPage() {
  return (
    <div className="rounded-lg border border-line bg-surface p-6">
      <h1 className="font-display text-2xl text-ink">Daftar</h1>
      <p className="mt-1 text-sm text-muted">
        Buat akun dengan Google untuk mulai.
      </p>
      <button
        type="button"
        onClick={() => signIn("google", { callbackUrl: "/app" })}
        className="mt-5 flex w-full items-center justify-center gap-2 rounded-full border border-line bg-paper px-4 py-2.5 text-sm font-medium text-ink hover:border-ink"
      >
        <span aria-hidden="true">G</span> Lanjutkan dengan Google
      </button>
      <p className="mt-5 text-sm text-muted">
        Sudah punya akun?{" "}
        <Link href="/login" className="text-accent">
          Masuk
        </Link>
      </p>
    </div>
  );
}
