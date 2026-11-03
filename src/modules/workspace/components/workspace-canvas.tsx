"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type {
  WorkspaceBlock,
  WorkspaceComposition,
  WorkspaceData,
  WorkspaceTheme,
  WorkspaceVariant,
} from "@/shared/lib/workspace-server";

type Device = "desktop" | "tablet" | "mobile";
type Snapshot = {
  themeId: string;
  tier: WorkspaceComposition["tier"];
  blocks: WorkspaceBlock[];
  content: Record<string, unknown>;
};

const DEVICES: Record<Device, { label: string; width: string }> = {
  desktop: { label: "Desktop", width: "100%" },
  tablet: { label: "Tablet", width: "834px" },
  mobile: { label: "Mobile", width: "390px" },
};

const STORAGE_PREFIX = "jioodev:workspace:";

export function WorkspaceCanvas({
  id,
  data,
  initialHtml,
}: {
  id: string;
  data: WorkspaceData;
  initialHtml: string;
}) {
  const [themeId, setThemeId] = useState(data.composition.theme_id);
  const [tier, setTier] = useState(data.composition.tier);
  const [blocks, setBlocks] = useState(data.composition.blocks);
  const [content, setContent] = useState(data.content);
  const [selectedSlot, setSelectedSlot] = useState(data.composition.blocks[0]?.slot ?? "");
  const [device, setDevice] = useState<Device>("desktop");
  const [html, setHtml] = useState(initialHtml);
  const [status, setStatus] = useState("Siap");
  const [history, setHistory] = useState<Snapshot[]>([]);
  const [future, setFuture] = useState<Snapshot[]>([]);
  const [draft, setDraft] = useState("");
  const [draftError, setDraftError] = useState("");
  const [hydrated, setHydrated] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const storageKey = `${STORAGE_PREFIX}${id}`;

  const selectedBlock = blocks.find((block) => block.slot === selectedSlot) ?? blocks[0];
  const variants = selectedSlot ? (data.variants[selectedSlot] ?? []) : [];
  const themes = data.themes;

  const snapshot = useMemo<Snapshot>(
    () => ({ themeId, tier, blocks, content }),
    [themeId, tier, blocks, content],
  );

  useEffect(() => {
    const raw = window.localStorage.getItem(storageKey);
    if (raw) {
      try {
        const saved = JSON.parse(raw) as Snapshot;
        setThemeId(saved.themeId);
        setTier(saved.tier);
        setBlocks(saved.blocks);
        setContent(saved.content);
        setStatus("Draft lokal");
      } catch {
        window.localStorage.removeItem(storageKey);
      }
    }
    setHydrated(true);
  }, [storageKey]);

  useEffect(() => {
    if (!selectedBlock) {
      setDraft("");
      return;
    }
    setDraft(JSON.stringify(content[selectedBlock.slot] ?? {}, null, 2));
    setDraftError("");
  }, [selectedBlock, content]);

  useEffect(() => {
    if (!hydrated) return;
    const timer = window.setTimeout(() => {
      window.localStorage.setItem(storageKey, JSON.stringify(snapshot));
      setStatus("Tersimpan");
    }, 400);
    return () => window.clearTimeout(timer);
  }, [hydrated, snapshot, storageKey]);

  useEffect(() => {
    if (!hydrated) return;
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(`/api/workspace/${id}/render`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(snapshot),
        });
        if (!response.ok) throw new Error("render");
        const next = await response.text();
        if (!cancelled) setHtml(next);
      } catch {
        if (!cancelled) setStatus("Render gagal");
      }
    }, 200);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [hydrated, id, snapshot]);

  function commit(next: Partial<Snapshot>) {
    setHistory((current) => [...current.slice(-19), snapshot]);
    setFuture([]);
    if (next.themeId !== undefined) setThemeId(next.themeId);
    if (next.tier !== undefined) setTier(next.tier);
    if (next.blocks !== undefined) setBlocks(next.blocks);
    if (next.content !== undefined) setContent(next.content);
  }

  function undo() {
    const previous = history.at(-1);
    if (!previous) return;
    setHistory((current) => current.slice(0, -1));
    setFuture((current) => [snapshot, ...current]);
    setThemeId(previous.themeId);
    setTier(previous.tier);
    setBlocks(previous.blocks);
    setContent(previous.content);
  }

  function redo() {
    const next = future[0];
    if (!next) return;
    setFuture((current) => current.slice(1));
    setHistory((current) => [...current, snapshot]);
    setThemeId(next.themeId);
    setTier(next.tier);
    setBlocks(next.blocks);
    setContent(next.content);
  }

  function move(slot: string, direction: -1 | 1) {
    const ordered = [...blocks].sort((a, b) => a.order - b.order);
    const index = ordered.findIndex((block) => block.slot === slot);
    const target = index + direction;
    if (index < 1 || target < 1 || target >= ordered.length - 1) return;
    const next = [...ordered];
    [next[index], next[target]] = [next[target], next[index]];
    commit({
      blocks: next.map((block, position) => ({
        ...block,
        order: position === 0 ? 1 : position === next.length - 1 ? 10 : position + 1,
      })),
    });
  }

  function toggle(slot: string) {
    commit({
      blocks: blocks.map((block) =>
        block.slot === slot ? { ...block, enabled: !block.enabled } : block,
      ),
    });
  }

  function changeVariant(slot: string, variant: string) {
    commit({
      blocks: blocks.map((block) =>
        block.slot === slot ? { ...block, variant } : block,
      ),
    });
  }

  function applyContent() {
    if (!selectedBlock) return;
    try {
      const parsed = JSON.parse(draft) as unknown;
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        throw new Error("Konten harus berupa object JSON.");
      }
      commit({
        content: { ...content, [selectedBlock.slot]: parsed },
      });
      setDraftError("");
      setStatus("Konten diterapkan");
    } catch (error) {
      setDraftError(error instanceof Error ? error.message : "JSON tidak valid.");
    }
  }

  function attachSelection() {
    const doc = iframeRef.current?.contentDocument;
    if (!doc) return;
    doc.querySelectorAll<HTMLElement>("[data-slot]").forEach((element) => {
      element.style.cursor = "pointer";
      element.addEventListener("click", (event) => {
        event.preventDefault();
        const slot = element.dataset.slot;
        if (slot) setSelectedSlot(slot);
      });
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-line bg-surface p-3">
        <div className="mr-auto">
          <p className="text-sm font-semibold text-ink">{data.composition.display_name}</p>
          <p className="text-xs text-muted">{data.composition.composition_id}</p>
        </div>
        <label className="text-xs text-muted">
          Theme
          <select
            className="ml-2 rounded-md border border-line bg-paper px-2 py-1 text-sm text-ink"
            value={themeId}
            onChange={(event) => commit({ themeId: event.target.value })}
          >
            {themes.map((theme: WorkspaceTheme) => (
              <option key={theme.theme_id} value={theme.theme_id}>
                {theme.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs text-muted">
          Tier
          <select
            className="ml-2 rounded-md border border-line bg-paper px-2 py-1 text-sm text-ink"
            value={tier}
            onChange={(event) =>
              commit({ tier: event.target.value as WorkspaceComposition["tier"] })
            }
          >
            {["BASIC", "PRO", "AGENCY"].map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
        <div className="flex gap-1">
          {Object.entries(DEVICES).map(([key, value]) => (
            <button
              key={key}
              type="button"
              onClick={() => setDevice(key as Device)}
              className={`rounded-md border px-2 py-1 text-xs ${
                device === key
                  ? "border-accent bg-accent-soft text-accent"
                  : "border-line text-muted"
              }`}
            >
              {value.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={undo}
          disabled={!history.length}
          className="rounded-md border border-line px-2 py-1 text-xs text-muted disabled:opacity-40"
        >
          Undo
        </button>
        <button
          type="button"
          onClick={redo}
          disabled={!future.length}
          className="rounded-md border border-line px-2 py-1 text-xs text-muted disabled:opacity-40"
        >
          Redo
        </button>
        <span className="text-xs text-muted">{status}</span>
      </div>

      <div className="grid gap-4 lg:grid-cols-[240px_minmax(0,1fr)_320px]">
        <aside data-testid="workspace-outline" className="rounded-lg border border-line bg-surface p-3">
          <h2 className="mb-2 text-sm font-semibold text-ink">Outline</h2>
          <ul className="space-y-1">
            {[...blocks]
              .sort((a, b) => a.order - b.order)
              .map((block) => (
                <li
                  key={block.slot}
                  className={`rounded-md border p-2 text-xs ${
                    selectedSlot === block.slot
                      ? "border-accent bg-accent-soft"
                      : "border-line"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setSelectedSlot(block.slot)}
                    className="flex w-full items-center justify-between gap-2 text-left"
                  >
                    <span className="font-medium text-ink">{block.slot}</span>
                    <span className="text-muted">{block.variant}</span>
                  </button>
                  <div className="mt-2 flex items-center gap-2">
                    <label className="flex items-center gap-1 text-muted">
                      <input
                        type="checkbox"
                        checked={block.enabled}
                        onChange={() => toggle(block.slot)}
                      />
                      aktif
                    </label>
                    <button
                      type="button"
                      onClick={() => move(block.slot, -1)}
                      className="rounded border border-line px-1.5"
                      aria-label={`Naikkan ${block.slot}`}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={() => move(block.slot, 1)}
                      className="rounded border border-line px-1.5"
                      aria-label={`Turunkan ${block.slot}`}
                    >
                      ↓
                    </button>
                  </div>
                </li>
              ))}
          </ul>
        </aside>

        <div className="min-w-0 rounded-lg border border-line bg-surface p-3">
          <div className="mb-2 flex items-center justify-between text-xs text-muted">
            <span>Canvas</span>
            <span>{DEVICES[device].label}</span>
          </div>
          <div className="flex justify-center overflow-auto bg-paper p-2">
            <iframe
              ref={iframeRef}
              title="Workspace canvas"
              srcDoc={html}
              onLoad={attachSelection}
              className="h-[720px] shrink-0 border border-line bg-white"
              style={{ width: DEVICES[device].width }}
            />
          </div>
        </div>

        <aside className="rounded-lg border border-line bg-surface p-3">
          <h2 className="mb-2 text-sm font-semibold text-ink">Inspector</h2>
          {selectedBlock ? (
            <div className="space-y-3">
              <div>
                <p className="text-xs text-muted">Slot</p>
                <p className="text-sm font-medium text-ink">{selectedBlock.slot}</p>
              </div>
              <label className="block text-xs text-muted">
                Variant
                <select
                  className="mt-1 w-full rounded-md border border-line bg-paper px-2 py-1 text-sm text-ink"
                  value={selectedBlock.variant}
                  onChange={(event) => changeVariant(selectedBlock.slot, event.target.value)}
                >
                  {variants.map((variant: WorkspaceVariant) => (
                    <option key={variant.code} value={variant.code}>
                      {variant.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-xs text-muted">
                Content JSON
                <textarea
                  data-testid="workspace-inspector-content"
                  className="mt-1 h-64 w-full rounded-md border border-line bg-paper p-2 font-mono text-xs text-ink"
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  spellCheck={false}
                />
              </label>
              {draftError ? <p className="text-xs text-danger">{draftError}</p> : null}
              <button
                type="button"
                onClick={applyContent}
                className="rounded-md bg-accent px-3 py-2 text-sm font-medium text-on-accent"
              >
                Terapkan Konten
              </button>
            </div>
          ) : (
            <p className="text-sm text-muted">Pilih slot di outline atau kanvas.</p>
          )}
        </aside>
      </div>
    </div>
  );
}
