"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";
import { useEffect, useState } from "react";
import { authErrorMessage } from "@/modules/auth/client";
import { Alert, GoogleIcon } from "@/shared/ui";

export default function RegisterPage() {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("error");
    if (code) setError(authErrorMessage(code));
  }, []);

  return (
    <div className="rounded-lg border border-line bg-surface p-6 shadow-sm sm:p-8">
      <h1 className="text-balance font-display text-3xl leading-tight tracking-[-0.025em] text-ink">
        Mulai dari konteks bisnis.
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        Buat akun dengan Google, lalu ceritakan bisnis Anda. Project pertama bisa
        langsung dilihat dalam bentuk varian.
      </p>
      {error ? (
        <div className="mt-5">
          <Alert tone="danger" title="Gagal mendaftar">
            {error}
          </Alert>
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => {
          setError(null);
          signIn("google", { callbackUrl: "/app" });
        }}
        className="mt-7 flex min-h-12 w-full items-center justify-center gap-2.5 rounded-full bg-accent px-4 text-sm font-medium text-on-accent transition-[background-color,border-color,color,transform] duration-150 active:scale-[0.96] hover:bg-accent-strong"
      >
        <span className="grid h-5 w-5 place-items-center rounded-full bg-white">
          <GoogleIcon className="h-3.5 w-3.5" />
        </span>
        Daftar dengan Google
      </button>
      <ul className="mt-6 space-y-2 border-t border-line pt-5 text-sm text-muted">
        <li>Gratis membuat project dan melihat varian.</li>
        <li>Bayar hanya saat siap deploy.</li>
        <li>Preview aman dan tidak diindeks mesin pencari.</li>
      </ul>
      <p className="mt-6 text-sm text-muted">
        Sudah punya akun?{" "}
        <Link href="/login" className="font-medium text-accent hover:underline">
          Masuk
        </Link>
      </p>
    </div>
  );
}
