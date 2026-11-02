"use client";

import Link from "next/link";
import { useState } from "react";

export default function ForgotPasswordPage() {
  const [status, setStatus] = useState("");
  return (
    <form
      className="rounded-lg border border-line bg-surface p-6"
      onSubmit={(e) => {
        e.preventDefault();
        setStatus("Reset password akan tersedia pada fase auth.");
      }}
    >
      <h1 className="font-display text-2xl text-ink">Lupa Sandi</h1>
      <p className="mt-1 text-sm text-muted">Masukkan email untuk tautan reset.</p>
      <label className="mt-5 block text-sm font-medium text-ink" htmlFor="email">
        Email
      </label>
      <input
        id="email"
        type="email"
        required
        className="mt-1 w-full rounded-lg border border-line bg-paper px-3 py-2"
      />
      <button
        type="submit"
        className="mt-5 w-full rounded-full bg-accent px-4 py-2.5 text-sm font-medium text-white hover:bg-accent-strong"
      >
        Kirim Tautan
      </button>
      {status ? <p className="mt-3 text-xs text-muted">{status}</p> : null}
      <p className="mt-4 text-sm text-muted">
        <Link href="/login" className="text-accent">Kembali ke Masuk</Link>
      </p>
    </form>
  );
}
