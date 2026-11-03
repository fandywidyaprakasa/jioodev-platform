"use client";

import { Eye, Layers, Type } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { api } from "@/shared/lib/api";
import { Badge, Button, Card, useToast } from "@/shared/ui";
import type { CopyField, Section } from "@/shared/types";

type Tool = "sections" | "copy";

export function CustomizeEditor({
  projectId,
  sections,
  copy,
  previewUrl,
  businessName,
}: {
  projectId: string;
  sections: Section[];
  copy: CopyField[];
  previewUrl?: string;
  businessName?: string;
}) {
  const { toast } = useToast();
  const [items, setItems] = useState(sections);
  const [fields, setFields] = useState(copy);
  const [tool, setTool] = useState<Tool>("sections");
  const [suggestions, setSuggestions] = useState<Record<string, string[]>>({});
  const [showReal, setShowReal] = useState(false);
  const [previewKey, setPreviewKey] = useState(0);
  const [pending, startTransition] = useTransition();

  const value = (key: string) =>
    fields.find((field) => field.key === key)?.value ?? "";

  function move(index: number, direction: -1 | 1) {
    const next = [...items];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setItems(next.map((item, order) => ({ ...item, order: order + 1 })));
  }

  function toggle(code: string) {
    if (code === "S-HERO") return;
    setItems((current) =>
      current.map((item) =>
        item.code === code ? { ...item, enabled: !item.enabled } : item,
      ),
    );
  }

  function saveSections() {
    startTransition(async () => {
      try {
        await api.sections.update(projectId, items);
        setPreviewKey((current) => current + 1);
        toast({ title: "Section tersimpan" });
      } catch (error) {
        toast({
          title: "Gagal menyimpan section",
          description: error instanceof Error ? error.message : "Coba lagi.",
          variant: "error",
        });
      }
    });
  }

  function saveCopy() {
    startTransition(async () => {
      try {
        await api.copy.save(projectId, fields);
        setPreviewKey((current) => current + 1);
        toast({ title: "Copy tersimpan" });
      } catch (error) {
        toast({
          title: "Gagal menyimpan copy",
          description: error instanceof Error ? error.message : "Coba lagi.",
          variant: "error",
        });
      }
    });
  }

  async function suggest(key: string) {
    const result = await api.copy.suggest(projectId, key);
    setSuggestions((current) => ({ ...current, [key]: result }));
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[56px_minmax(280px,340px)_1fr]">
      <nav
        aria-label="Panel alat"
        className="flex gap-1 rounded-lg border border-line bg-surface p-1 lg:flex-col"
      >
        <button
          type="button"
          aria-pressed={tool === "sections"}
          onClick={() => setTool("sections")}
          className={`flex min-h-11 flex-1 items-center justify-center gap-2 rounded-md px-2 py-2 text-xs font-medium lg:flex-col ${
            tool === "sections" ? "bg-accent-soft text-accent" : "text-muted hover:text-ink"
          }`}
        >
          <Layers className="h-4 w-4" aria-hidden="true" />
          Section
        </button>
        <button
          type="button"
          aria-pressed={tool === "copy"}
          onClick={() => setTool("copy")}
          className={`flex min-h-11 flex-1 items-center justify-center gap-2 rounded-md px-2 py-2 text-xs font-medium lg:flex-col ${
            tool === "copy" ? "bg-accent-soft text-accent" : "text-muted hover:text-ink"
          }`}
        >
          <Type className="h-4 w-4" aria-hidden="true" />
          Copy
        </button>
      </nav>

      <div className="space-y-4">
        {tool === "sections" ? (
          <Card title="Urutan & visibilitas" description="Aktifkan section yang dipakai.">
            <ul className="divide-y divide-line">
              {items.map((item, index) => (
                <li key={item.code} className="flex flex-wrap items-center gap-2 py-3">
                  <label className="flex flex-1 items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={item.enabled}
                      disabled={item.code === "S-HERO"}
                      onChange={() => toggle(item.code)}
                    />
                    <span className="font-medium text-ink">{item.name}</span>
                    {item.code === "S-HERO" ? (
                      <span className="text-[10px] uppercase tracking-wide text-muted">
                        Wajib
                      </span>
                    ) : null}
                  </label>
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" onClick={() => move(index, -1)} disabled={index === 0}>
                      Naik
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => move(index, 1)}
                      disabled={index === items.length - 1}
                    >
                      Turun
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
            <div className="mt-4 flex justify-end">
              <Button onClick={saveSections} loading={pending}>
                Simpan Section
              </Button>
            </div>
          </Card>
        ) : (
          <Card title="Edit copy" description="Override teks tanpa menyentuh HTML.">
            <div className="space-y-4">
              {fields.map((field) => (
                <div key={field.key} className="rounded-md border border-line p-3">
                  <label htmlFor={field.key} className="text-sm font-medium text-ink">
                    {field.label}
                  </label>
                  <textarea
                    id={field.key}
                    rows={2}
                    value={field.value}
                    onChange={(event) =>
                      setFields((current) =>
                        current.map((item) =>
                          item.key === field.key
                            ? { ...item, value: event.target.value }
                            : item,
                        ),
                      )
                    }
                    className="mt-1 w-full rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink"
                  />
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <Button size="sm" variant="secondary" onClick={() => suggest(field.key)}>
                      Saran AI
                    </Button>
                    {suggestions[field.key]?.map((suggestion) => (
                      <button
                        key={suggestion}
                        type="button"
                        onClick={() =>
                          setFields((current) =>
                            current.map((item) =>
                              item.key === field.key
                                ? { ...item, value: suggestion }
                                : item,
                            ),
                          )
                        }
                        className="rounded-md border border-line px-2 py-1 text-left text-xs text-muted hover:text-ink"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 flex justify-end">
              <Button onClick={saveCopy} loading={pending}>
                Simpan Copy
              </Button>
            </div>
          </Card>
        )}
      </div>

      <div className="space-y-3 lg:sticky lg:top-4 lg:self-start">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-sm font-medium text-ink">
            <Eye className="h-4 w-4" aria-hidden="true" />
            Live canvas
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant={showReal ? "primary" : "secondary"} onClick={() => setShowReal(false)}>
              Ringkas
            </Button>
            <Button
              size="sm"
              variant={showReal ? "secondary" : "primary"}
              onClick={() => setShowReal(true)}
              disabled={!previewUrl}
            >
              HTML asli
            </Button>
          </div>
        </div>
        <div className="overflow-hidden rounded-lg border border-line bg-surface shadow-sm">
          <div className="flex items-center gap-1 border-b border-line bg-paper px-3 py-2">
            <span className="h-2 w-2 rounded-full bg-line" />
            <span className="h-2 w-2 rounded-full bg-line" />
            <span className="h-2 w-2 rounded-full bg-line" />
            <span className="ml-2 truncate text-xs text-muted">
              {businessName || "Preview"} · {projectId}
            </span>
          </div>
          {showReal && previewUrl ? (
            <iframe
              key={previewKey}
              src={previewUrl}
              title="Preview HTML"
              className="h-[620px] w-full bg-white"
            />
          ) : (
            <div className="space-y-4 p-6">
              <Badge variant="accent">{value("hero_eyebrow") || "Eyebrow"}</Badge>
              <h2 className="font-display text-3xl leading-tight text-ink">
                {value("hero_title") || "Judul utama Anda"}
              </h2>
              <p className="max-w-xl text-sm text-muted">
                {value("hero_subtitle") || "Deskripsi singkat nilai bisnis Anda."}
              </p>
              <span className="inline-flex rounded-full bg-accent px-4 py-2 text-sm font-medium text-on-accent">
                {value("cta_button") || "Ajakan bertindak"}
              </span>
              <ul className="grid gap-2 pt-4 sm:grid-cols-2">
                {items
                  .filter((item) => item.enabled)
                  .map((item) => (
                    <li
                      key={item.code}
                      className="rounded-md border border-line px-3 py-2 text-sm text-ink"
                    >
                      {item.name}
                    </li>
                  ))}
              </ul>
            </div>
          )}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line bg-surface p-3 text-sm">
          <span className="text-muted">Perubahan tersimpan per bagian.</span>
          <div className="flex gap-2">
            <Link
              href={`/app/projects/${projectId}`}
              className="rounded-full border border-line px-4 py-2 text-sm font-medium text-ink hover:border-ink/40"
            >
              Kembali
            </Link>
            <Link
              href={`/app/projects/${projectId}/payment`}
              className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-on-accent hover:bg-accent-strong"
            >
              Lanjut Pembayaran
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
