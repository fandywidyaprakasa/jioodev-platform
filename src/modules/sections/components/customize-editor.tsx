"use client";

import { useState, useTransition } from "react";
import { api } from "@/shared/lib/api";
import { Badge, Button, Card, Tabs, useToast } from "@/shared/ui";
import type { CopyField, Section } from "@/shared/types";

export function CustomizeEditor({
  projectId,
  sections,
  copy,
}: {
  projectId: string;
  sections: Section[];
  copy: CopyField[];
}) {
  const { toast } = useToast();
  const [items, setItems] = useState(sections);
  const [fields, setFields] = useState(copy);
  const [suggestions, setSuggestions] = useState<Record<string, string[]>>({});
  const [pending, startTransition] = useTransition();

  function move(index: number, direction: -1 | 1) {
    const next = [...items];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setItems(next.map((item, order) => ({ ...item, order: order + 1 })));
  }

  function toggle(code: string) {
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

  async function suggest(key: string) {
    const result = await api.copy.suggest(key);
    setSuggestions((current) => ({ ...current, [key]: result }));
  }

  return (
    <Tabs
      items={[
        {
          id: "sections",
          label: "Section",
          content: (
            <Card title="Urutan & visibilitas" description="Aktifkan section yang dipakai.">
              <ul className="divide-y divide-line">
                {items.map((item, index) => (
                  <li key={item.code} className="flex flex-wrap items-center gap-3 py-3">
                    <label className="flex flex-1 items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={item.enabled}
                        onChange={() => toggle(item.code)}
                      />
                      <span className="font-medium text-ink">{item.name}</span>
                      <Badge variant="neutral">{item.code}</Badge>
                    </label>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => move(index, -1)}
                        disabled={index === 0}
                      >
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
          ),
        },
        {
          id: "copy",
          label: "Copy",
          content: (
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
                <Button
                  onClick={() =>
                    toast({ title: "Copy tersimpan", description: "Perubahan tersimpan sebagai override." })
                  }
                >
                  Simpan Copy
                </Button>
              </div>
            </Card>
          ),
        },
      ]}
    />
  );
}
