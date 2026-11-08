"use client";

import { Loader2, Monitor, Smartphone, Tablet } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { PREVIEW_IFRAME_SANDBOX } from "@/lib/iframe-sandbox";

export type PreviewDevice = "desktop" | "tablet" | "mobile";

export const PREVIEW_VIEWPORTS: Record<
  PreviewDevice,
  { width: number; height: number; label: string }
> = {
  desktop: { width: 1440, height: 900, label: "Desktop" },
  tablet: { width: 834, height: 1112, label: "Tablet" },
  mobile: { width: 390, height: 844, label: "Mobile" },
};

export function previewAspect(device: PreviewDevice) {
  const viewport = PREVIEW_VIEWPORTS[device];
  return `${viewport.width} / ${viewport.height}`;
}

export function PreviewDeviceToggle({
  device,
  onChange,
  overlay = false,
}: {
  device: PreviewDevice;
  onChange: (device: PreviewDevice) => void;
  overlay?: boolean;
}) {
  const options = [
    { id: "desktop" as const, label: "Desktop", Icon: Monitor },
    { id: "tablet" as const, label: "Tablet", Icon: Tablet },
    { id: "mobile" as const, label: "Mobile", Icon: Smartphone },
  ];

  return (
    <div
      role="group"
      aria-label="Proporsi preview"
      className={
        overlay
          ? "absolute right-2 top-2 z-30 flex items-center gap-0.5 rounded-md border border-line bg-surface p-0.5 shadow-sm"
          : "flex h-11 w-fit items-center gap-0.5 rounded-md border border-line bg-surface p-0.5 sm:h-10"
      }
    >
      {options.map(({ id, label, Icon }) => (
        <button
          key={id}
          type="button"
          onClick={() => onChange(id)}
          aria-pressed={device === id}
          aria-label={`Preview ${label}`}
          title={label}
          className={`grid h-10 w-10 place-items-center rounded-md transition-colors duration-150 ${
            device === id
              ? "bg-accent-soft text-accent"
              : "text-muted hover:bg-paper hover:text-ink"
          }`}
        >
          <Icon className="h-4 w-4" aria-hidden="true" />
        </button>
      ))}
    </div>
  );
}

export function TemplateLivePreview({
  code,
  device,
  compact = false,
}: {
  code: string;
  device: PreviewDevice;
  compact?: boolean;
}) {
  const viewport = PREVIEW_VIEWPORTS[device];
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;
    const update = () => {
      const width = element.clientWidth;
      if (width) setScale(Math.min(1, width / viewport.width));
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, [viewport.width]);

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full overflow-hidden bg-white"
    >
      {scale > 0 ? (
        <iframe
          key={device}
          src={`/template-preview/${code}`}
          title={`Preview template ${code} — ${viewport.label}`}
          className="absolute left-0 top-0 origin-top-left border-0 bg-white"
          style={{
            width: viewport.width,
            height: viewport.height,
            transform: `scale(${scale})`,
          }}
          loading="lazy"
          tabIndex={compact ? -1 : undefined}
          aria-hidden={compact || undefined}
          sandbox={PREVIEW_IFRAME_SANDBOX}
          onLoad={() => setLoading(false)}
        />
      ) : null}

      {loading || scale === 0 ? (
        <div className="absolute inset-0 grid place-items-center bg-paper/85 text-muted">
          <span className="flex items-center gap-2 text-xs" role="status">
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
            Memuat preview…
          </span>
        </div>
      ) : null}
    </div>
  );
}
