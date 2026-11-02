"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { api } from "@/shared/lib/api";
import { Button, Card, Progress, useToast } from "@/shared/ui";
import type { ComprehendResult } from "@/shared/types";

export function ComprehendReview({
  projectId,
  result,
}: {
  projectId: string;
  result: ComprehendResult;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [corrections, setCorrections] = useState("");
  const [pending, startTransition] = useTransition();

  function confirm() {
    startTransition(async () => {
      try {
        await api.projects.confirmComprehend(projectId, corrections || undefined);
        toast({ title: "Pemahaman dikonfirmasi" });
        router.push(`/app/projects/${projectId}/templates`);
      } catch (error) {
        toast({
          title: "Gagal mengonfirmasi",
          description: error instanceof Error ? error.message : "Coba lagi.",
          variant: "error",
        });
      }
    });
  }

  return (
    <div className="space-y-4">
      <Card title="Ringkasan AI">
        <p className="text-sm leading-relaxed text-ink">{result.summary}</p>
        <div className="mt-4 max-w-sm">
          <Progress
            value={Math.round(result.confidence * 100)}
            label="Keyakinan"
          />
        </div>
      </Card>
      <Card title="Koreksi (opsional)" description="Tambahkan hal yang belum tepat.">
        <textarea
          rows={4}
          value={corrections}
          onChange={(event) => setCorrections(event.target.value)}
          className="w-full rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink"
          placeholder="Contoh: target utama sebenarnya ibu rumah tangga, bukan pekerja kantor."
        />
        <div className="mt-4 flex justify-end">
          <Button onClick={confirm} loading={pending}>
            Konfirmasi & Pilih Template
          </Button>
        </div>
      </Card>
    </div>
  );
}
