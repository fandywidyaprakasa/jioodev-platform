"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { api } from "@/shared/lib/api";
import { Button, Card, useToast } from "@/shared/ui";
import type { ProductType } from "@/shared/types";

const OPTIONS: { type: ProductType; title: string; description: string }[] = [
  {
    type: "LAND",
    title: "Landing Page",
    description: "Satu halaman fokus konversi: menu, layanan, atau penawaran.",
  },
  {
    type: "WEB",
    title: "Website",
    description: "Multi-halaman untuk profil bisnis, layanan, dan kontak.",
  },
  {
    type: "COMM",
    title: "Commerce Lite",
    description: "Katalog produk dengan jalur order WhatsApp.",
  },
];

export function NewProjectForm() {
  const router = useRouter();
  const { toast } = useToast();
  const [selected, setSelected] = useState<ProductType>("LAND");
  const [pending, startTransition] = useTransition();

  function submit() {
    startTransition(async () => {
      try {
        const project = await api.projects.create(selected);
        toast({ title: "Project dibuat", description: "Lanjut isi business context." });
        router.push(`/app/projects/${project.id}/context`);
      } catch (error) {
        toast({
          title: "Gagal membuat project",
          description: error instanceof Error ? error.message : "Coba lagi.",
          variant: "error",
        });
      }
    });
  }

  return (
    <Card
      title="Pilih tipe produk"
      description="Tipe menentukan struktur halaman dan alur berikutnya."
    >
      <div className="grid gap-3 sm:grid-cols-3">
        {OPTIONS.map((option) => {
          const active = selected === option.type;
          return (
            <button
              key={option.type}
              type="button"
              onClick={() => setSelected(option.type)}
              aria-pressed={active}
              className={`rounded-lg border p-4 text-left transition-colors ${
                active
                  ? "border-accent bg-accent-soft"
                  : "border-line bg-surface hover:border-ink/30"
              }`}
            >
              <p className="font-medium text-ink">{option.title}</p>
              <p className="mt-1 text-sm text-muted">{option.description}</p>
            </button>
          );
        })}
      </div>
      <div className="mt-5 flex justify-end">
        <Button onClick={submit} loading={pending}>
          Buat Project
        </Button>
      </div>
    </Card>
  );
}
