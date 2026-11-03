"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { api } from "@/shared/lib/api";
import { Badge, Button, Card, useToast } from "@/shared/ui";
import type { GenerationJob } from "@/shared/types";

export function PreviewPanel({
  projectId,
  status,
  job,
}: {
  projectId: string;
  status: string;
  job: GenerationJob | null;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const variants = job?.variants ?? [];
  const [selectedId, setSelectedId] = useState(variants[0]?.id ?? "");
  const [device, setDevice] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const selected = variants.find((item) => item.id === selectedId) ?? variants[0];

  function pick() {
    if (!selected) return;
    startTransition(async () => {
      try {
        await api.generation.select(projectId, selected.id);
        toast({ title: "Varian dipilih", description: "Lanjut atur section dan copy." });
        router.push(`/app/projects/${projectId}/customize`);
      } catch (error) {
        toast({
          title: "Gagal memilih varian",
          description: error instanceof Error ? error.message : "Coba lagi.",
          variant: "error",
        });
      }
    });
  }

  return (
    <div className="space-y-4">
      <Card title="Varian desain" description="Pilih arah desain, lalu bandingkan desktop dan mobile.">
        {variants.length ? (
          <div className="flex flex-wrap gap-2">
            {variants.map((variant) => (
              <Button
                key={variant.id}
                size="sm"
                variant={variant.id === selected?.id ? "primary" : "secondary"}
                onClick={() => setSelectedId(variant.id)}
              >
                {variant.label}
              </Button>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted">
            Varian belum tersedia.{" "}
            <Link href={`/app/projects/${projectId}/generate`} className="text-accent hover:underline">
              Jalankan generate
            </Link>
            .
          </p>
        )}
        <div className="mt-4 flex items-center justify-between">
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={device === "desktop" ? "primary" : "secondary"}
              onClick={() => setDevice("desktop")}
            >
              Desktop
            </Button>
            <Button
              size="sm"
              variant={device === "tablet" ? "primary" : "secondary"}
              onClick={() => setDevice("tablet")}
            >
              Tablet
            </Button>
            <Button
              size="sm"
              variant={device === "mobile" ? "primary" : "secondary"}
              onClick={() => setDevice("mobile")}
            >
              Mobile
            </Button>
          </div>
          <p className="text-xs text-muted">
            Preview · {projectId} · status {status}
          </p>
        </div>
      </Card>

      {selected ? (
        <div className="flex justify-center rounded-lg border border-line bg-paper p-4">
          <div
            className={`overflow-hidden rounded-md border border-line bg-surface shadow-md transition-[width] ${
              device === "mobile"
                ? "w-[360px] max-w-full"
                : device === "tablet"
                  ? "w-[834px] max-w-full"
                  : "w-full"
            }`}
          >
            <div className="flex items-center justify-between border-b border-line bg-paper px-3 py-2 text-xs text-muted">
              <span>
                {device === "mobile" ? "360px" : device === "tablet" ? "834px" : "Desktop"}
              </span>
              <Badge variant="accent">{selected.label}</Badge>
            </div>
            <iframe
              src={selected.previewUrl}
              title={`Preview ${selected.label}`}
              className="h-[600px] w-full bg-white"
            />
          </div>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line bg-surface p-4">
        <p className="text-sm text-muted">
          {selected ? `Varian: ${selected.label}` : "Belum ada varian dipilih."}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/app/projects/${projectId}`}
            className="rounded-full border border-line px-4 py-2 text-sm font-medium text-ink hover:border-ink/40"
          >
            Kembali ke Project
          </Link>
          {selected && status === "PREVIEWS" ? (
            <Button onClick={pick} loading={pending}>
              Pilih &amp; Lanjut Customize
            </Button>
          ) : status === "GENERATING" ? (
            <Link
              href={`/app/projects/${projectId}/generate`}
              className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-on-accent hover:bg-accent-strong"
            >
              Tunggu Generate
            </Link>
          ) : (
            <Button onClick={() => router.push(`/app/projects/${projectId}/customize`)}>
              Lanjut ke Customize
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
