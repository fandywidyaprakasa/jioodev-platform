"use client";

import { useState } from "react";

export default function AdminLoginPage() {
  const [status, setStatus] = useState("");
  return (
    <div className="mx-auto max-w-md">
      <form
        className="rounded-lg border border-line bg-surface p-6"
        onSubmit={(e) => {
          e.preventDefault();
          setStatus("Auth admin belum diimplementasikan (P1-BE-02). Akses ditutup.");
        }}
      >
        <h1 className="font-display text-2xl text-ink">Login Admin</h1>
        <p className="mt-1 text-sm text-muted">Akses internal JSDEV.</p>
        <label className="mt-5 block text-sm font-medium text-ink" htmlFor="email">
          Email
        </label>
        <input
          id="email"
          type="email"
          required
          className="mt-1 w-full rounded-lg border border-line bg-paper px-3 py-2"
        />
        <label className="mt-4 block text-sm font-medium text-ink" htmlFor="password">
          Password
        </label>
        <input
          id="password"
          type="password"
          required
          className="mt-1 w-full rounded-lg border border-line bg-paper px-3 py-2"
        />
        <button
          type="submit"
          className="mt-5 w-full rounded-full bg-accent px-4 py-2.5 text-sm font-medium text-white hover:bg-accent-strong"
        >
          Masuk
        </button>
        {status ? <p className="mt-3 text-xs text-muted">{status}</p> : null}
      </form>
    </div>
  );
}
