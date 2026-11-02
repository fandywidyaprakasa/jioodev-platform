"use client";

import { useMemo, useState } from "react";
import { Badge, Empty, Input, Select } from "@/shared/ui";
import type { Template } from "@/shared/types";

export interface TemplateGridProps {
  templates: Template[];
  hrefBase?: string;
  onSelect?: (template: Template) => void;
  selectedCode?: string;
}

export function TemplateGrid({
  templates,
  hrefBase,
  onSelect,
  selectedCode,
}: TemplateGridProps) {
  const [query, setQuery] = useState("");
  const [type, setType] = useState("all");

  const filtered = useMemo(
    () =>
      templates.filter((template) => {
        const matchesType = type === "all" || template.productType === type;
        const haystack = `${template.name} ${template.code} ${template.industries.join(" ")}`.toLowerCase();
        return matchesType && haystack.includes(query.toLowerCase());
      }),
    [templates, type, query],
  );

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Input
          label="Cari template"
          placeholder="Nama, kode, atau industri"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <Select
          label="Tipe"
          value={type}
          onChange={(event) => setType(event.target.value)}
          options={[
            { value: "all", label: "Semua tipe" },
            { value: "LAND", label: "Landing" },
            { value: "WEB", label: "Website" },
            { value: "COMM", label: "Commerce" },
          ]}
        />
      </div>

      {filtered.length ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((template) => {
            const selected = selectedCode === template.code;
            const inner = (
              <>
                <div className="flex aspect-[4/3] items-end rounded-md bg-gradient-to-br from-accent-soft via-paper to-line p-3">
                  <span className="rounded bg-surface/90 px-2 py-1 text-xs font-medium text-muted">
                    {template.layout} · {template.style}
                  </span>
                </div>
                <div className="mt-3 flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-ink">{template.name}</p>
                    <p className="text-xs text-muted">{template.code}</p>
                  </div>
                  <Badge variant={selected ? "accent" : "neutral"}>
                    {template.productType}
                  </Badge>
                </div>
                <p className="mt-2 text-sm text-muted">{template.description}</p>
              </>
            );

            const className = `block rounded-lg border p-3 text-left transition-colors ${
              selected
                ? "border-accent bg-accent-soft"
                : "border-line bg-surface hover:border-ink/30"
            }`;

            if (onSelect) {
              return (
                <button
                  key={template.code}
                  type="button"
                  onClick={() => onSelect(template)}
                  className={className}
                >
                  {inner}
                </button>
              );
            }

            return (
              <a
                key={template.code}
                href={hrefBase ? `${hrefBase}/${template.code}` : `/templates/${template.code}`}
                className={className}
              >
                {inner}
              </a>
            );
          })}
        </div>
      ) : (
        <Empty
          title="Template tidak ditemukan"
          description="Ubah kata kunci atau filter tipe."
        />
      )}
    </div>
  );
}
