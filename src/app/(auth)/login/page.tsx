"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";
import { useState } from "react";

export default function LoginPage() {
  const [remember, setRemember] = useState(false);
  const [status, setStatus] = useState("");

  function google() {
    const params = new URLSearchParams(window.location.search);
    const next = params.get("next") || "/app";
    document.cookie = `jioodev_remember=${remember ? "1" : "0"}; path=/; max-age=${
      remember ? 2592000 : 43200
    }; samesite=lax`;
    setStatus("Mengalihkan ke Google...");
    signIn("google", { callbackUrl: next });
  }

  return (
    <div className="rounded-lg border border-line bg-surface p-6">
      <h1 className="font-display text-2xl text-ink">Masuk</h1>
      <p className="mt-1 text-sm text-muted">
        Gunakan akun Google untuk melanjutkan.
      </p>

      <button
        type="button"
        onClick={google}
        className="mt-5 flex w-full items-center justify-center gap-2 rounded-full border border-line bg-paper px-4 py-2.5 text-sm font-medium text-ink hover:border-ink"
      >
        <span aria-hidden="true">G</span> Lanjutkan dengan Google
      </button>

      <label className="mt-4 flex items-center gap-2 text-sm text-muted">
        <input
          type="checkbox"
          checked={remember}
          onChange={(e) => setRemember(e.target.checked)}
        />
        Ingat saya (30 hari)
      </label>

      {status ? <p className="mt-3 text-xs text-muted">{status}</p> : null}

      <p className="mt-5 text-sm text-muted">
        Belum punya akun?{" "}
        <Link href="/register" className="text-accent">
          Daftar
        </Link>
      </p>
    </div>
  );
}
