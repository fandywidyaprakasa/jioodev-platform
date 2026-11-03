"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { TemplateGrid } from "./template-grid";
import { api } from "@/shared/lib/api";
import { Button, useToast } from "@/shared/ui";
import type { Template } from "@/shared/types";

export function TemplatePicker({
  projectId,
  templates,
  contextNote,
}: {
  projectId: string;
  templates: Template[];
  contextNote?: string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [selected, setSelected] = useState<string>();
  const [pending, startTransition] = useTransition();

  function next() {
    if (!selected) return;
    startTransition(async () => {
      try {
        await api.projects.update(projectId, {
          templateCode: selected,
          status: "TEMPLATE_CHOSEN",
        });
        toast({ title: "Template dipilih", description: selected });
        router.push(`/app/projects/${projectId}/generate`);
      } catch (error) {
        toast({
          title: "Gagal memilih template",
          description: error instanceof Error ? error.message : "Coba lagi.",
          variant: "error",
        });
      }
    });
  }

  return (
    <div className="space-y-4">
      {contextNote ? (
        <p className="rounded-md border border-line bg-paper px-3 py-2 text-xs text-muted">
          {contextNote}
        </p>
      ) : null}
      <TemplateGrid
        templates={templates}
        onSelect={(template) => setSelected(template.code)}
        selectedCode={selected}
      />
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line bg-surface p-4">
        <p className="text-sm text-muted">
          {selected ? `Dipilih: ${selected}` : "Pilih satu template untuk melanjutkan."}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/app/projects/${projectId}`}
            className="rounded-full border border-line px-4 py-2 text-sm font-medium text-ink hover:border-ink/40"
          >
            Kembali ke Project
          </Link>
          <Button onClick={next} disabled={!selected} loading={pending}>
            Gunakan Template
          </Button>
        </div>
      </div>
    </div>
  );
}
