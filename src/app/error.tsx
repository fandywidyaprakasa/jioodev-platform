"use client";

import { Button, Card } from "@/shared/ui";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto max-w-xl px-4 py-16">
      <Card title="Terjadi kesalahan" description="Permintaan tidak dapat diselesaikan.">
        <p className="text-sm text-muted">{error.message || "Coba muat ulang halaman."}</p>
        <div className="mt-4">
          <Button onClick={reset}>Coba lagi</Button>
        </div>
      </Card>
    </div>
  );
}
