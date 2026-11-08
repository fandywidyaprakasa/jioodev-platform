"use client";

import { History, RotateCcw, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

export interface VersionEntry {
  version: string;
  timestamp: string;
  author: string;
  message?: string;
  sections: readonly {
    code: string;
    name?: string;
    enabled?: boolean;
    order?: number;
    variantId?: string;
    content?: Record<string, unknown> | null;
  }[];
  themeId?: string;
  tier?: "BASIC" | "PRO" | "AGENCY";
  compositionId?: string;
  pageId?: string;
}

function formatStamp(timestamp: string): string {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return timestamp;
  return date.toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function VersionHistoryPanel({
  projectId,
  pageId,
  open,
  onClose,
  onRestore,
  restoringVersion,
}: {
  projectId: string;
  pageId?: string;
  open: boolean;
  onClose: () => void;
  onRestore: (version: VersionEntry) => void;
  restoringVersion: string | null;
}) {
  const [versions, setVersions] = useState<VersionEntry[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (pageId) params.set("pageId", pageId);
      const query = params.size ? `?${params.toString()}` : "";
      const response = await fetch(`/api/projects/${projectId}/site/versions${query}`);
      if (!response.ok) throw new Error("Gagal memuat riwayat");
      const body = (await response.json()) as { versions?: VersionEntry[] };
      setVersions(body.versions ?? []);
    } catch {
      setVersions([]);
    } finally {
      setLoading(false);
    }
  }, [projectId, pageId]);

  useEffect(() => {
    if (open) void load();
  }, [open, load]);

  if (!open) return null;

  return (
    <div
      data-testid="workspace-version-history"
      className="absolute right-3 top-full z-20 mt-2 max-h-[70vh] w-72 overflow-auto rounded-lg border border-line bg-surface p-3 shadow-lg"
      role="dialog"
      aria-label="Riwayat versi"
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-1.5 text-sm font-semibold text-ink">
          <History className="h-4 w-4" aria-hidden="true" />
          Riwayat versi
        </h3>
        <button
          type="button"
          onClick={onClose}
          aria-label="Tutup riwayat versi"
          className="grid h-7 w-7 place-items-center rounded text-muted transition-colors duration-150 hover:bg-paper hover:text-ink"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
      {loading ? (
        <p className="py-4 text-center text-xs text-muted" role="status">
          Memuat…
        </p>
      ) : versions.length === 0 ? (
        <p className="py-4 text-center text-xs text-muted">
          Belum ada versi tersimpan.
        </p>
      ) : (
        <ul className="space-y-2">
          {versions.map((version) => (
            <li
              key={version.version}
              className="rounded-md border border-line bg-paper p-2"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-xs font-medium text-ink">
                  {formatStamp(version.timestamp)}
                </p>
                <button
                  type="button"
                  onClick={() => onRestore(version)}
                  disabled={restoringVersion !== null}
                  className="inline-flex shrink-0 items-center gap-1 rounded border border-line px-2 py-1 text-xs font-medium text-accent transition-colors duration-150 hover:border-ink/40 disabled:opacity-40"
                >
                  {restoringVersion === version.version ? (
                    "Memulihkan…"
                  ) : (
                    <>
                      <RotateCcw className="h-3 w-3" aria-hidden="true" />
                      Pulihkan
                    </>
                  )}
                </button>
              </div>
              <p className="mt-0.5 truncate text-xs text-muted">
                {version.author}
                {version.message ? ` · ${version.message}` : ""}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
