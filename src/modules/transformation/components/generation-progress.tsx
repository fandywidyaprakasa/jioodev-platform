"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { api } from "@/shared/lib/api";
import { Badge, Button, Card, Progress, useToast } from "@/shared/ui";
import type { GenerationJob } from "@/shared/types";

export function GenerationProgress({
  projectId,
  job,
}: {
  projectId: string;
  job: GenerationJob;
}) {
  const { toast } = useToast();
  const [progress, setProgress] = useState(job.status === "READY" ? 100 : 8);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  useEffect(() => {
    if (progress >= 100) return;
    const timer = window.setInterval(() => {
      setProgress((current) => Math.min(100, current + 9 + Math.round(Math.random() * 8)));
    }, 500);
    return () => window.clearInterval(timer);
  }, [progress]);

  function select(variantId: string) {
    setPendingId(variantId);
    startTransition(async () => {
      try {
        await api.generation.select(projectId, variantId);
        toast({ title: "Varian dipilih", description: "Lanjut ke preview dan kustomisasi." });
      } catch (error) {
        toast({
          title: "Gagal memilih varian",
          description: error instanceof Error ? error.message : "Coba lagi.",
          variant: "error",
        });
      } finally {
        setPendingId(null);
      }
    });
  }

  return (
    <div className="space-y-4">
      <Card title="Proses generate" description="Hermes menyusun varian dari template terpilih.">
        <Progress value={progress} label={progress >= 100 ? "Selesai" : "Generate berjalan"} />
        <p className="mt-3 text-sm text-muted">
          {progress >= 100
            ? "3 varian siap ditinjau."
            : "Anda boleh menutup halaman ini; proses tetap berjalan di server."}
        </p>
      </Card>

      {progress >= 100 ? (
        <div className="grid gap-4 sm:grid-cols-3">
          {job.variants.map((variant) => (
            <Card key={variant.id} title={variant.label}>
              <div className="flex aspect-[4/3] items-center justify-center rounded-md bg-gradient-to-br from-accent-soft via-paper to-line text-xs text-muted">
                Preview varian
              </div>
              <div className="mt-3 flex items-center justify-between gap-2">
                <Badge variant="success">READY</Badge>
                <Button
                  size="sm"
                  onClick={() => select(variant.id)}
                  loading={pendingId === variant.id}
                >
                  Pilih
                </Button>
              </div>
              <Link
                href={`/app/projects/${projectId}/preview`}
                className="mt-2 inline-block text-xs font-medium text-accent hover:underline"
              >
                Lihat preview
              </Link>
            </Card>
          ))}
        </div>
      ) : null}
    </div>
  );
}
