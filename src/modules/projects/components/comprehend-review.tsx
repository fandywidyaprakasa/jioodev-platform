"use client";

import Link from "next/link";
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
  const hasContext = result.confidence > 0 && result.summary.trim().length > 0;

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

  if (!hasContext) {
    return (
      <Card title="Ringkasan AI">
        <p className="text-sm leading-relaxed text-ink">Konteks belum diisi.</p>
        <p className="mt-2 text-sm text-muted">
          Lengkapi business brief agar AI dapat merangkum bisnis Anda sebelum
          pemahaman dikonfirmasi.
        </p>
        <Link
          href={`/app/projects/${projectId}/context`}
          className="mt-4 inline-flex min-h-11 items-center rounded-md border border-line px-4 text-sm font-medium text-ink transition-colors duration-150 hover:border-ink/40"
        >
          Isi business brief
        </Link>
      </Card>
    );
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
