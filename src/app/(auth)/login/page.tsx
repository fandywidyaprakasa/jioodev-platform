"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";
import { useState } from "react";
import { GoogleIcon } from "@/shared/ui";

export default function LoginPage() {
  const [remember, setRemember] = useState(false);
  const [status, setStatus] = useState("");

  function google() {
    const params = new URLSearchParams(window.location.search);
    const next = params.get("next") || "/app";
    document.cookie = `jioodev_remember=${remember ? "1" : "0"}; path=/${
      remember ? "; max-age=2592000" : ""
    }; samesite=lax`;
    setStatus("Mengalihkan ke Google...");
    signIn("google", { callbackUrl: next });
  }

  return (
    <div className="rounded-lg border border-line bg-surface p-6 shadow-sm sm:p-8">
      <h1 className="font-display text-3xl leading-tight tracking-[-0.025em] text-ink">
        Masuk ke workspace.
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        Gunakan akun Google. Tidak ada kata sandi tambahan yang perlu diingat.
      </p>

      <button
        type="button"
        onClick={google}
        disabled={Boolean(status)}
        aria-busy={Boolean(status) || undefined}
        className="mt-7 flex min-h-12 w-full items-center justify-center gap-2.5 rounded-full border border-line bg-paper px-4 text-sm font-medium text-ink transition-colors duration-150 hover:border-ink/40 disabled:cursor-wait disabled:opacity-70"
      >
        <GoogleIcon />
        {status ? "Mengalihkan…" : "Lanjutkan dengan Google"}
      </button>

      <label className="mt-5 flex min-h-11 cursor-pointer items-center gap-2.5 text-sm text-muted">
        <input
          type="checkbox"
          className="h-4 w-4 accent-accent"
          checked={remember}
          onChange={(event) => setRemember(event.target.checked)}
        />
        Ingat saya selama 30 hari
      </label>

      {status ? (
        <p className="mt-3 text-xs text-muted" role="status">
          {status}
        </p>
      ) : null}

      <div className="mt-7 border-t border-line pt-5">
        <p className="text-sm text-muted">
          Belum punya akun?{" "}
          <Link href="/register" className="font-medium text-accent hover:underline">
            Daftar dengan Google
          </Link>
        </p>
      </div>

      <p className="mt-4 text-xs leading-relaxed text-muted">
        Dengan masuk, Anda menyetujui penggunaan akun Google untuk autentikasi dan
        penyimpanan project di JiooDev.
      </p>
    </div>
  );
}
