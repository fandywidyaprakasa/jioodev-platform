"use client";

import { Check } from "lucide-react";
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
              className={`relative min-h-28 rounded-lg border p-4 text-left transition-[border-color,background-color,box-shadow] duration-150 ${
                active
                  ? "border-accent bg-accent-soft shadow-sm"
                  : "border-line bg-surface hover:border-ink/30"
              }`}
            >
              <span className="flex items-center justify-between gap-2">
                <span className="font-mono text-[10px] tracking-[0.12em] text-muted">
                  {option.type}
                </span>
                {active ? (
                  <span className="grid h-5 w-5 place-items-center rounded-full bg-accent text-on-accent">
                    <Check className="h-3 w-3" aria-hidden="true" />
                  </span>
                ) : null}
              </span>
              <span className="mt-3 block text-[15px] font-semibold text-ink">
                {option.title}
              </span>
              <span className="mt-1 block text-sm leading-relaxed text-muted">
                {option.description}
              </span>
            </button>
          );
        })}
      </div>
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5">
        <p className="max-w-[46ch] text-sm leading-relaxed text-muted">
          Setelah dibuat, Anda akan mengisi konteks bisnis. Tipe produk menentukan
          struktur fondasi yang dipakai.
        </p>
        <Button onClick={submit} loading={pending}>
          Buat Project
        </Button>
      </div>
    </Card>
  );
}
