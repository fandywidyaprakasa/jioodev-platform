"use client";

import {
  ChevronLeft,
  ChevronRight,
  Monitor,
  Smartphone,
  Tablet,
  X,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { ProductType, Template, ThemeTier } from "@/shared/types";
import {
  PREVIEW_IFRAME_SANDBOX,
  shouldSandboxPreviewIframe,
} from "@/lib/iframe-sandbox";

export interface PreviewModalEntry {
  themeName: string;
  product: ProductType;
  tier: ThemeTier;
  variant: Template;
}

type Device = "web" | "tablet" | "mobile";

const DEVICES: Array<{ id: Device; label: string; width: string; Icon: LucideIcon }> = [
  { id: "web", label: "Web", width: "100%", Icon: Monitor },
  { id: "tablet", label: "Tablet", width: "834px", Icon: Tablet },
  { id: "mobile", label: "Mobile", width: "390px", Icon: Smartphone },
];

const PRODUCT_LABEL: Record<ProductType, string> = {
  LAND: "Landing",
  WEB: "Website",
  COMM: "Commerce",
};

export function PreviewModal({
  entries,
  initialIndex,
  projectId,
  onClose,
  onUse,
}: {
  entries: PreviewModalEntry[];
  initialIndex: number;
  projectId?: string;
  onClose: () => void;
  onUse?: (code: string) => void;
}) {
  const [index, setIndex] = useState(
    Math.min(Math.max(initialIndex, 0), Math.max(entries.length - 1, 0)),
  );
  const [device, setDevice] = useState<Device>("web");
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const touchStart = useRef<number | null>(null);
  const entry = entries[index];
  const deviceIndex = DEVICES.findIndex((item) => item.id === device);
  const currentDevice = DEVICES[deviceIndex] ?? DEVICES[0];
  const nextDevice = DEVICES[(deviceIndex + 1) % DEVICES.length] ?? DEVICES[0];

  function next() {
    setIndex((value) => (entries.length ? (value + 1) % entries.length : 0));
  }

  function previous() {
    setIndex((value) =>
      entries.length ? (value - 1 + entries.length) % entries.length : 0,
    );
  }

  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
        return;
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        setIndex((value) =>
          entries.length ? (value + 1) % entries.length : 0,
        );
        return;
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        setIndex((value) =>
          entries.length ? (value - 1 + entries.length) % entries.length : 0,
        );
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = Array.from(
        dialogRef.current?.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), iframe, [tabindex]:not([tabindex="-1"])',
        ) ?? [],
      );
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, [entries.length, onClose]);

  if (!entry) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-3 sm:p-6">
      <button
        type="button"
        tabIndex={-1}
        aria-label="Tutup preview"
        onClick={onClose}
        className="absolute inset-0 bg-ink/65 backdrop-blur-sm"
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={`Preview ${entry.themeName} ${entry.variant.variantLabel ?? entry.variant.name}`}
        className="relative flex max-h-[94vh] w-full max-w-6xl flex-col overflow-hidden rounded-lg border border-line bg-surface shadow-2xl"
      >
        <header className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-4 py-3 sm:px-5">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-ink">
              {entry.themeName} · {entry.variant.variantLabel ?? entry.variant.name}
            </p>
            <p className="mt-0.5 text-xs text-muted tabular-nums">
              {PRODUCT_LABEL[entry.product]} · {entry.tier} · {entry.variant.layout} ·{" "}
              {index + 1} / {entries.length}
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setDevice(nextDevice.id)}
              aria-label={`Tampilan ${currentDevice.label}. Klik untuk ${nextDevice.label}.`}
              title={`Tampilan ${currentDevice.label} · klik ${nextDevice.label}`}
              className="grid h-10 w-10 place-items-center rounded-md border border-line bg-paper text-muted transition-colors duration-150 hover:border-ink/30 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35"
            >
              <currentDevice.Icon className="h-4 w-4" aria-hidden="true" />
            </button>
            <button
              ref={closeRef}
              type="button"
              onClick={onClose}
              aria-label="Tutup preview"
              className="grid h-10 w-10 place-items-center rounded-md border border-line bg-paper text-muted transition-colors duration-150 hover:border-ink/30 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </header>

        <div
          className="flex min-h-0 flex-1 justify-center overflow-auto bg-paper p-3"
          onTouchStart={(event) => {
            touchStart.current = event.touches[0]?.clientX ?? null;
          }}
          onTouchEnd={(event) => {
            const start = touchStart.current;
            const end = event.changedTouches[0]?.clientX;
            touchStart.current = null;
            if (start === null || end === undefined) return;
            if (Math.abs(end - start) < 50) return;
            if (end < start) next();
            else previous();
          }}
        >
          <iframe
            key={entry.variant.code}
            src={entry.variant.previewUrl}
            title={`Preview ${entry.variant.variantLabel ?? entry.variant.name}`}
            className="h-[70vh] min-h-[420px] shrink-0 rounded-md border border-line bg-white shadow-sm"
            style={{ width: currentDevice.width, maxWidth: "100%" }}
            sandbox={
              typeof entry.variant.previewUrl === "string" &&
              shouldSandboxPreviewIframe(entry.variant.previewUrl)
                ? PREVIEW_IFRAME_SANDBOX
                : undefined
            }
          />
        </div>

        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-3 sm:px-5">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={previous}
              disabled={entries.length < 2}
              aria-label="Varian sebelumnya"
              className="inline-flex h-10 items-center gap-1 rounded-md border border-line px-2.5 text-xs font-medium text-ink transition-colors duration-150 disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              Prev
            </button>
            <button
              type="button"
              onClick={next}
              disabled={entries.length < 2}
              aria-label="Varian berikutnya"
              className="inline-flex h-10 items-center gap-1 rounded-md border border-line px-2.5 text-xs font-medium text-ink transition-colors duration-150 disabled:opacity-40"
            >
              Next
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href={`/templates/${entry.variant.code}`}
              className="text-xs font-medium text-accent hover:underline"
            >
              Detail varian
            </Link>
            {projectId && onUse ? (
              <button
                type="button"
                onClick={() => onUse(entry.variant.code)}
                className="rounded-md bg-accent px-3 py-2 text-xs font-medium text-on-accent hover:bg-accent-strong"
              >
                Gunakan varian
              </button>
            ) : null}
          </div>
        </footer>
      </div>
    </div>
  );
}
