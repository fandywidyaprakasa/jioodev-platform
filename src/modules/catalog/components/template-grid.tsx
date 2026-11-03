"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  PreviewDeviceToggle,
  TemplateLivePreview,
  previewAspect,
  type PreviewDevice,
} from "./template-live-preview";
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
  const [device, setDevice] = useState<PreviewDevice>("desktop");

  const filtered = useMemo(
    () =>
      templates.filter((template) => {
        const matchesType = type === "all" || template.productType === type;
        const haystack =
          `${template.name} ${template.code} ${template.industries.join(" ")}`.toLowerCase();
        return matchesType && haystack.includes(query.toLowerCase());
      }),
    [templates, type, query],
  );

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_auto] lg:items-end">
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
        <div className="flex flex-col gap-1.5 sm:col-span-2 lg:col-span-1">
          <span className="text-sm font-medium text-ink">Tampilan</span>
          <PreviewDeviceToggle device={device} onChange={setDevice} />
        </div>
      </div>

      {filtered.length ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((template) => {
            const selected = selectedCode === template.code;
            const className = `group relative block overflow-hidden rounded-lg border bg-surface text-left transition-[border-color,box-shadow,transform] duration-150 focus-within:ring-2 focus-within:ring-accent/35 focus-within:ring-offset-2 focus-within:ring-offset-paper ${
              selected
                ? "border-accent shadow-md"
                : "border-line shadow-sm hover:-translate-y-0.5 hover:border-ink/30 hover:shadow-md"
            }`;
            const href = hrefBase
              ? `${hrefBase}/${template.code}`
              : `/templates/${template.code}`;

            return (
              <div key={template.code} className={className}>
                {onSelect ? (
                  <button
                    type="button"
                    onClick={() => onSelect(template)}
                    aria-label={`Pilih template ${template.name}`}
                    className="absolute inset-0 z-10 rounded-lg focus-visible:outline-none"
                  />
                ) : (
                  <Link
                    href={href}
                    aria-label={`Lihat template ${template.name}`}
                    className="absolute inset-0 z-10 rounded-lg focus-visible:outline-none"
                  />
                )}

                <div
                  className="relative overflow-hidden border-b border-line bg-surface transition-[aspect-ratio] duration-200"
                  style={{ aspectRatio: previewAspect(device) }}
                >
                  <TemplateLivePreview
                    key={`${template.code}-${device}`}
                    code={template.code}
                    device={device}
                    compact
                  />
                </div>

                <div className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="text-[15px] font-semibold text-ink">
                        {template.name}
                      </h2>
                      <p className="mt-0.5 font-mono text-[10px] text-muted">
                        {template.code}
                      </p>
                    </div>
                    <Badge variant={selected ? "accent" : "neutral"}>
                      {template.productType}
                    </Badge>
                  </div>
                  <p className="mt-2.5 text-sm leading-relaxed text-muted">
                    {template.description}
                  </p>
                </div>
              </div>
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
