"use client";

import { useState, useTransition } from "react";
import { api } from "@/shared/lib/api";
import { Button, Card, useToast } from "@/shared/ui";

interface Asset {
  id: string;
  name: string;
  url: string;
  size: number;
  createdAt: string;
}

export function AssetUploader({
  projectId,
  initial,
}: {
  projectId: string;
  initial: Asset[];
}) {
  const { toast } = useToast();
  const [assets, setAssets] = useState(initial);
  const [pending, startTransition] = useTransition();

  function upload(file: File | undefined) {
    if (!file) return;
    startTransition(async () => {
      try {
        const asset = await api.projects.uploadAsset(projectId, file);
        setAssets((current) => [asset, ...current]);
        toast({ title: "Aset diunggah" });
      } catch (error) {
        toast({
          title: "Gagal mengunggah",
          description: error instanceof Error ? error.message : "Coba lagi.",
          variant: "error",
        });
      }
    });
  }

  return (
    <Card
      title="Aset visual"
      description="Unggah logo atau foto (PNG, JPEG, WEBP, SVG maks. 5MB)."
    >
      <label className="flex cursor-pointer flex-col items-center justify-center rounded-md border border-dashed border-line bg-paper px-4 py-6 text-sm text-muted hover:border-accent">
        <span className="font-medium text-ink">Pilih file</span>
        <span className="mt-1 text-xs">Maksimal 5MB per file</span>
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp,image/svg+xml"
          className="sr-only"
          disabled={pending}
          onChange={(event) => upload(event.target.files?.[0])}
        />
      </label>
      {assets.length ? (
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {assets.map((asset) => (
            <li key={asset.id} className="flex items-center gap-3 rounded-md border border-line p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={asset.url}
                alt={asset.name}
                className="h-12 w-12 rounded-md object-cover"
              />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-ink">{asset.name}</p>
                <p className="text-xs text-muted">
                  {(asset.size / 1024).toFixed(0)} KB
                </p>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-xs text-muted">Belum ada aset.</p>
      )}
      <Button className="sr-only" type="button">
        Upload
      </Button>
    </Card>
  );
}
