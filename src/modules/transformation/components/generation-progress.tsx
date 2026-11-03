"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
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
  const router = useRouter();
  const { toast } = useToast();
  const [current, setCurrent] = useState(job);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  useEffect(() => {
    if (current.status === "READY" || current.status === "FAILED") return;
    const timer = window.setInterval(() => {
      api.generation
        .get(projectId, current.id)
        .then((next) => {
          setCurrent(next);
          if (next.status === "READY") {
            toast({ title: "Preview siap", description: "3 varian siap ditinjau." });
          }
          if (next.status === "FAILED") {
            toast({
              title: "Generate gagal",
              description: "Coba jalankan ulang.",
              variant: "error",
            });
          }
        })
        .catch(() => undefined);
    }, 1500);
    return () => window.clearInterval(timer);
  }, [current.id, current.status, projectId, toast]);

  function select(variantId: string) {
    setPendingId(variantId);
    startTransition(async () => {
      try {
        await api.generation.select(projectId, variantId);
        toast({ title: "Varian dipilih", description: "Membuka preview." });
        router.push(`/app/projects/${projectId}/preview`);
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

  const ready = current.status === "READY";
  const progress = ready ? 100 : Math.max(8, current.progress);

  return (
    <div className="space-y-4">
      <Card title="Proses generate" description="Hermes menyusun varian dari template terpilih.">
        <Progress
          value={progress}
          label={
            current.status === "FAILED"
              ? "Gagal"
              : ready
                ? "Selesai"
                : "Generate berjalan"
          }
        />
        <p className="mt-3 text-sm text-muted">
          {ready
            ? "3 varian siap ditinjau."
            : current.status === "FAILED"
              ? "Generate gagal. Kembali ke project lalu coba lagi."
              : "Anda boleh menutup halaman ini; proses tetap berjalan di server."}
        </p>
      </Card>

      {ready ? (
        <div className="grid gap-4 sm:grid-cols-3">
          {current.variants.map((variant) => (
            <Card key={variant.id} title={variant.label}>
              <iframe
                src={variant.previewUrl}
                title={`Preview ${variant.label}`}
                className="aspect-[4/3] w-full rounded-md border border-line bg-paper"
                loading="lazy"
              />
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
                href={variant.previewUrl}
                target="_blank"
                className="mt-2 inline-block text-xs font-medium text-accent hover:underline"
              >
                Buka preview
              </Link>
            </Card>
          ))}
        </div>
      ) : null}

      <div className="flex justify-start">
        <Link
          href={`/app/projects/${projectId}`}
          className="text-sm font-medium text-accent hover:underline"
        >
          Kembali ke Project
        </Link>
      </div>
    </div>
  );
}
