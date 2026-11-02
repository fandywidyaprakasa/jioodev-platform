"use client";

import { useState } from "react";
import { Badge, Button, Card } from "@/shared/ui";

const STYLES = [
  { id: "EDT", label: "Editorial" },
  { id: "MIN", label: "Minimal" },
  { id: "BLD", label: "Bold" },
];

const LAYOUTS = [
  { id: "L-MENU", label: "Menu-forward" },
  { id: "L-STORY", label: "Story-forward" },
  { id: "L-CONV", label: "Conversion" },
];

export function PreviewPanel({ projectId }: { projectId: string }) {
  const [style, setStyle] = useState("EDT");
  const [layout, setLayout] = useState("L-MENU");
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");

  return (
    <div className="space-y-4">
      <Card title="Dua sumbu preview" description="Ganti style dan layout tanpa mengubah isi.">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="mb-2 text-sm font-medium text-ink">Style</p>
            <div className="flex flex-wrap gap-2">
              {STYLES.map((item) => (
                <Button
                  key={item.id}
                  size="sm"
                  variant={style === item.id ? "primary" : "secondary"}
                  onClick={() => setStyle(item.id)}
                >
                  {item.label}
                </Button>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-2 text-sm font-medium text-ink">Layout</p>
            <div className="flex flex-wrap gap-2">
              {LAYOUTS.map((item) => (
                <Button
                  key={item.id}
                  size="sm"
                  variant={layout === item.id ? "primary" : "secondary"}
                  onClick={() => setLayout(item.id)}
                >
                  {item.label}
                </Button>
              ))}
            </div>
          </div>
        </div>
        <div className="mt-4 flex items-center justify-between">
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={device === "desktop" ? "primary" : "secondary"}
              onClick={() => setDevice("desktop")}
            >
              Desktop
            </Button>
            <Button
              size="sm"
              variant={device === "mobile" ? "primary" : "secondary"}
              onClick={() => setDevice("mobile")}
            >
              Mobile
            </Button>
          </div>
          <p className="text-xs text-muted">
            Preview · {projectId} · {style} · {layout}
          </p>
        </div>
      </Card>

      <div className="flex justify-center rounded-lg border border-line bg-paper p-4">
        <div
          className={`overflow-hidden rounded-md border border-line bg-surface shadow-md transition-[width] ${
            device === "mobile" ? "w-[360px]" : "w-full"
          }`}
        >
          <div className="border-b border-line bg-paper px-3 py-2 text-xs text-muted">
            {device === "mobile" ? "360px" : "Desktop"} · {style} · {layout}
          </div>
          <div className="p-6">
            <Badge variant="accent">{style}</Badge>
            <h2 className="mt-3 font-display text-3xl text-ink">
              Kopi pagi, energi baru
            </h2>
            <p className="mt-2 max-w-xl text-sm text-muted">
              Biji lokal, racikan konsisten, dan ruang tenang untuk memulai hari.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <span className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-white">
                Pesan via WhatsApp
              </span>
              <span className="rounded-full border border-line px-4 py-2 text-sm text-ink">
                Lihat Menu
              </span>
            </div>
            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {["Espresso", "Manual Brew", "Pastry"].map((item) => (
                <div key={item} className="rounded-md border border-line p-3">
                  <p className="text-sm font-medium text-ink">{item}</p>
                  <p className="text-xs text-muted">Mulai Rp25.000</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
