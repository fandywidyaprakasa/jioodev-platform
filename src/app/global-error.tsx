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
          <h1 className="text-balance font-display text-2xl">JiooDev tidak dapat dimuat</h1>
          <p className="mt-2 text-sm text-muted">{error.message}</p>
          <button
            type="button"
            onClick={reset}
            className="mt-4 inline-flex items-center rounded-full bg-accent px-4 py-2 text-sm font-medium text-on-accent transition-[background-color,border-color,color,transform] duration-150 active:scale-[0.96]"
          >
            Coba lagi
          </button>
        </main>
      </body>
    </html>
  );
}
