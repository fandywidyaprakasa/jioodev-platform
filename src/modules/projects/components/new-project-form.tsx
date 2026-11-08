"use client";

import { Check, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { api } from "@/shared/lib/api";
import { Button, Card, useToast } from "@/shared/ui";
import type { ProductType } from "@/shared/types";

export interface SelectedTemplate {
  code: string;
  name: string;
}

const OPTIONS: { type: ProductType; title: string; description: string }[] = [
  {
    type: "LAND",
    title: "Landing Page",
    description: "Satu halaman fokus konversi: menu, layanan, atau penawaran.",
  },
];

export function NewProjectForm({
  initialTemplate = null,
}: {
  initialTemplate?: SelectedTemplate | null;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [selected, setSelected] = useState<ProductType>("LAND");
  const [mode, setMode] = useState<"idea" | "guide">("guide");
  const [template, setTemplate] = useState<SelectedTemplate | null>(
    initialTemplate,
  );
  const [pending, startTransition] = useTransition();

  function submit() {
    startTransition(async () => {
      try {
        const project = await api.projects.create(selected, template?.code);
        toast({ title: "Project dibuat", description: "Lanjut isi business context." });
        router.push(`/app/projects/${project.id}/context?mode=${mode}`);
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
      description="MVP saat ini fokus pada Landing Page."
    >
      {template ? (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-md border border-accent/40 bg-accent-soft px-3 py-2.5">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
              Template terpilih
            </p>
            <p className="mt-0.5 text-sm font-medium text-ink">
              {template.name}{" "}
              <span className="font-mono text-xs text-muted">
                {template.code}
              </span>
            </p>
          </div>
          <button
            type="button"
            onClick={() => setTemplate(null)}
            className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-line bg-surface px-3 text-xs font-medium text-ink transition-colors hover:border-ink/40"
          >
            <X className="h-3 w-3" aria-hidden="true" />
            Hapus
          </button>
        </div>
      ) : (
        <p className="mb-4 text-sm text-muted">
          Belum memilih template.{" "}
          <Link href="/app/templates" className="font-medium text-accent hover:underline">
            Jelajahi Template Library
          </Link>
          .
        </p>
      )}
      <div className="grid gap-3">
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
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {[
          {
            value: "guide",
            title: "Bantu saya menentukan",
            description: "Belum punya ide? AI membantu merumuskan arah dari konteks bisnis.",
          },
          {
            value: "idea",
            title: "Saya sudah punya ide",
            description: "Sudah tahu arahnya? Tulis preferensi dan biarkan AI merapikannya.",
          },
        ].map((item) => (
          <button
            key={item.value}
            type="button"
            onClick={() => setMode(item.value as "idea" | "guide")}
            aria-pressed={mode === item.value}
            className={`rounded-lg border p-3 text-left transition-colors ${
              mode === item.value
                ? "border-accent bg-accent-soft"
                : "border-line bg-surface hover:border-ink/30"
            }`}
          >
            <span className="block text-sm font-semibold text-ink">{item.title}</span>
            <span className="mt-1 block text-xs leading-relaxed text-muted">
              {item.description}
            </span>
          </button>
        ))}
      </div>
      <p className="mt-4 text-sm leading-relaxed text-muted">
        Simple Website dan Commerce Lite sedang disiapkan dan belum tersedia di MVP.
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5">
        <p className="max-w-[46ch] text-sm leading-relaxed text-muted">
          Setelah dibuat, Anda akan mengisi konteks bisnis untuk project klien.
        </p>
        <Button onClick={submit} loading={pending}>
          Buat Project
        </Button>
      </div>
    </Card>
  );
}
