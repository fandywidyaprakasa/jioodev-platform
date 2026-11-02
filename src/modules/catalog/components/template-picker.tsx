"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { TemplateGrid } from "./template-grid";
import { api } from "@/shared/lib/api";
import { Button, useToast } from "@/shared/ui";
import type { Template } from "@/shared/types";

export function TemplatePicker({
  projectId,
  templates,
}: {
  projectId: string;
  templates: Template[];
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
      <TemplateGrid
        templates={templates}
        onSelect={(template) => setSelected(template.code)}
        selectedCode={selected}
      />
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line bg-surface p-4">
        <p className="text-sm text-muted">
          {selected ? `Dipilih: ${selected}` : "Pilih satu template untuk melanjutkan."}
        </p>
        <Button onClick={next} disabled={!selected} loading={pending}>
          Gunakan Template
        </Button>
      </div>
    </div>
  );
}
