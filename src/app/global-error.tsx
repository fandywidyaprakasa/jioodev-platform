"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="id">
      <body className="font-body">
        <main className="mx-auto max-w-xl px-4 py-16">
          <h1 className="font-display text-2xl">JiooDev tidak dapat dimuat</h1>
          <p className="mt-2 text-sm text-muted">{error.message}</p>
          <button
            type="button"
            onClick={reset}
            className="mt-4 rounded-full bg-accent px-4 py-2 text-sm font-medium text-on-accent"
          >
            Coba lagi
          </button>
        </main>
      </body>
    </html>
  );
}
