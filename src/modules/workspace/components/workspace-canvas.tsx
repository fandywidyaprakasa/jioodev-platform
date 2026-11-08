"use client";

import { tierLabel } from "@/shared/lib/taxonomy";
import {
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  FileText,
  History,
  Layers,
  Monitor,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  Redo2,
  RefreshCw,
  Settings,
  Smartphone,
  Tablet,
  Undo2,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { api } from "@/shared/lib/api";
import { PagesPanel, type WorkspacePageSummary } from "./pages-panel";
import {
  SiteSettingsPanel,
  type SiteSettingsSummary,
} from "./site-settings-panel";
import type { ProjectAsset } from "@/shared/types";
import type {
  WorkspaceBlock,
  WorkspaceComposition,
  WorkspaceData,
  WorkspaceVariant,
} from "@/modules/workspace";
import {
  negotiateWorkspaceCapabilities,
  type WorkspaceEditorOperation,
} from "./workspace-capabilities";
import { SectionOverlay } from "./section-overlay";
import { SectionToolbar } from "./section-toolbar";
import { useIframeScrollPreservation } from "./use-iframe-scroll";
import { useUnsavedChangesGuard } from "./use-unsaved-guard";
import {
  useUndoRedo,
  UNDO_HISTORY_LIMIT,
} from "./use-undo-redo";
import type { UseUndoRedoReturn } from "./use-undo-redo";
import { CollabProvider } from "@/modules/workspace/collab/collab-provider";
import { useCollab } from "@/modules/workspace/collab/use-collab";
import { isCollabConfigured } from "@/modules/workspace/collab/liveblocks-config";
import {
  VersionHistoryPanel,
  type VersionEntry,
} from "./version-history-panel";

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

const LEFT_TABS = [
  { id: "sections", label: "Sections", Icon: Layers },
  { id: "pages", label: "Pages", Icon: FileText },
  { id: "global", label: "Global", Icon: Settings },
] as const;

const STORAGE_PREFIX = "jioodev:workspace:";

const FIELD_LABELS: Record<string, string> = {
  eyebrow: "Teks kecil di atas judul",
  headline: "Judul utama",
  subheadline: "Subjudul",
  title: "Judul",
  subtitle: "Subjudul",
  body: "Isi teks",
  label: "Teks tombol",
  href: "Tautan",
  src: "Sumber gambar",
  alt: "Deskripsi gambar",
  alignment: "Perataan",
  business_name: "Nama bisnis",
  tagline: "Slogan",
  address: "Alamat",
  phone: "Telepon",
  email: "Email",
  copyright: "Hak cipta",
  note: "Catatan",
  background_image: "Gambar latar",
  maps_url: "Tautan peta",
};

const NESTED_LABELS: Record<string, string> = {
  primary_cta: "Tombol utama",
  secondary_cta: "Tombol kedua",
  media: "Gambar",
  links: "Tautan",
  social: "Media sosial",
  hours: "Jam buka",
};

const MULTILINE_KEYS = new Set([
  "headline",
  "subheadline",
  "title",
  "subtitle",
  "body",
  "description",
  "tagline",
  "quote",
  "address",
  "copyright",
  "note",
]);

type FriendlyField = {
  path: string[];
  label: string;
  value: string;
  multiline: boolean;
};

function humanizeKey(key: string) {
  const words = key.replace(/[_-]+/g, " ").trim();
  if (!words) return key;
  return words.charAt(0).toUpperCase() + words.slice(1);
}

function fieldLabel(path: string[]) {
  const key = path[path.length - 1] ?? "";
  const leaf = FIELD_LABELS[key] ?? humanizeKey(key);
  if (path.length < 2) return leaf;
  const parents = path
    .slice(0, -1)
    .map((part) => NESTED_LABELS[part] ?? humanizeKey(part))
    .join(" › ");
  return `${parents} › ${leaf}`;
}

function collectFriendlyFields(
  value: unknown,
  path: string[] = [],
  fields: FriendlyField[] = [],
): FriendlyField[] {
  if (typeof value === "string") {
    if (!path.length) return fields;
    const key = path[path.length - 1] ?? "";
    fields.push({
      path,
      label: fieldLabel(path),
      value,
      multiline: MULTILINE_KEYS.has(key),
    });
    return fields;
  }
  if (Array.isArray(value) || value === null || typeof value !== "object") {
    return fields;
  }
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    collectFriendlyFields(child, [...path, key], fields);
  }
  return fields;
}

function setFieldValue(
  source: Record<string, unknown>,
  path: string[],
  value: unknown,
): Record<string, unknown> {
  const [head, ...rest] = path;
  if (!head) return source;
  if (!rest.length) return { ...source, [head]: value };
  const existing = source[head];
  const child =
    existing && typeof existing === "object" && !Array.isArray(existing)
      ? (existing as Record<string, unknown>)
      : {};
  return { ...source, [head]: setFieldValue(child, rest, value) };
}

function avatarColorFromName(name: string): string {
  const colors = [
    "#f472b6",
    "#a78bfa",
    "#60a5fa",
    "#34d399",
    "#fbbf24",
    "#fb923c",
    "#f87171",
    "#22d3ee",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

export function WorkspaceCanvas({
  id,
  projectId,
  pageId,
  pages = [],
  siteSettings = {},
  data,
  assets: initialAssets = [],
  initialHtml,
  adapterId,
  adapterVersion,
}: {
  id: string;
  projectId?: string;
  pageId?: string;
  pages?: WorkspacePageSummary[];
  siteSettings?: SiteSettingsSummary;
  data: WorkspaceData;
  assets?: ProjectAsset[];
  initialHtml: string;
  adapterId?: string;
  adapterVersion?: string;
}) {
  const [themeId, setThemeId] = useState(data.composition.theme_id);
  const [tier, setTier] = useState(data.composition.tier);
  const [blocks, setBlocks] = useState(data.composition.blocks);
  const [content, setContent] = useState(data.content);
  const [selectedSlot, setSelectedSlot] = useState(data.composition.blocks[0]?.slot ?? "");
  const [device, setDevice] = useState<Device>("desktop");
  const [html, setHtml] = useState(initialHtml);
  const [status, setStatus] = useState("Siap");
  const timeline = useUndoRedo<Snapshot>(UNDO_HISTORY_LIMIT);
  const [draft, setDraft] = useState("");
  const [draftError, setDraftError] = useState("");
  const [assets, setAssets] = useState(initialAssets);
  const [uploading, setUploading] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [mode, setMode] = useState<"simple" | "pro">("simple");
  const [leftTab, setLeftTab] = useState<"sections" | "pages" | "global">("sections");
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const activeFieldRef = useRef<string | null>(null);
  const storageKey = `${STORAGE_PREFIX}${projectId ?? id}:${pageId ?? "legacy"}`;
  const capabilities = useMemo(
    () => negotiateWorkspaceCapabilities({ adapterId, adapterVersion }),
    [adapterId, adapterVersion],
  );
  const can = capabilities.isSupported;

  const [renderError, setRenderError] = useState(false);
  const [renderNonce, setRenderNonce] = useState(0);
  const [isRendering, setIsRendering] = useState(false);
  const [versionsOpen, setVersionsOpen] = useState(false);
  const [restoringVersion, setRestoringVersion] = useState<string | null>(null);

  const { handleLoad: handleScrollLoad } = useIframeScrollPreservation(iframeRef);

  const { data: session } = useSession();

  const collabConfig = useMemo(() => {
    if (!isCollabConfigured || !session?.user) return null;
    const publicKey = process.env.NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY ?? "";
    const user = session.user as { id?: string; name?: string; email?: string; image?: string };
    if (!can("section.content.edit")) return null;
    return {
      publicKey,
      roomId: id,
      user: {
        id: user.id ?? "unknown",
        name: user.name ?? "Anonymous",
        email: user.email,
        avatarColor: avatarColorFromName(user.name ?? user.email ?? "U"),
      },
    };
  }, [session, id, can]);

  const { updateCursor } = useCollab({
    config: collabConfig,
    selectedSlot,
  });

  // Track mouse position in iframe canvas
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe || !collabConfig) return;

    let throttleTimer: ReturnType<typeof setTimeout> | null = null;

    function onMouseMove(e: MouseEvent) {
      if (throttleTimer) return;
      throttleTimer = setTimeout(() => {
        throttleTimer = null;
      }, 50);
      updateCursor({ x: e.clientX, y: e.clientY });
    }

    function onMouseLeave() {
      updateCursor(null);
    }

    iframe.contentWindow?.addEventListener("mousemove", onMouseMove);
    iframe.contentWindow?.addEventListener("mouseleave", onMouseLeave);
    return () => {
      iframe.contentWindow?.removeEventListener("mousemove", onMouseMove);
      iframe.contentWindow?.removeEventListener("mouseleave", onMouseLeave);
      if (throttleTimer) clearTimeout(throttleTimer);
    };
  }, [collabConfig, updateCursor]);

  const dirty = timeline.canUndo || status === "Menyimpan";
  useUnsavedChangesGuard(dirty);

  function unsupportedReason(operation: WorkspaceEditorOperation) {
    return can(operation) ? undefined : (capabilities.reasonFor(operation) ?? undefined);
  }

  const selectedBlock = blocks.find((block) => block.slot === selectedSlot) ?? blocks[0];
  const variants = selectedSlot ? (data.variants[selectedSlot] ?? []) : [];
  const themes = data.themes;
  const selectedVariantName =
    variants.find((variant) => variant.code === selectedBlock?.variant)?.name ??
    selectedBlock?.variant ??
    "";
  const variantsFor = (slot: string) => data.variants[slot] ?? [];
  const friendlyFields = useMemo(
    () => (selectedBlock ? collectFriendlyFields(content[selectedBlock.slot]) : []),
    [content, selectedBlock],
  );

  const snapshot = useMemo<Snapshot>(
    () => ({ themeId, tier, blocks, content }),
    [themeId, tier, blocks, content],
  );

  useEffect(() => {
    if (!capabilities.supported) {
      setHydrated(true);
      return;
    }
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
  }, [capabilities.supported, storageKey]);

  useEffect(() => {
    try {
      const savedMode = window.localStorage.getItem(`${storageKey}:mode`);
      if (savedMode === "simple" || savedMode === "pro") setMode(savedMode);
      const savedPanels = window.localStorage.getItem(`${storageKey}:panels`);
      if (savedPanels) {
        const parsed = JSON.parse(savedPanels) as {
          left?: boolean;
          right?: boolean;
        };
        if (typeof parsed.left === "boolean") setLeftOpen(parsed.left);
        if (typeof parsed.right === "boolean") setRightOpen(parsed.right);
      }
    } catch {
      // Ignore storage restrictions.
    }
  }, [storageKey]);

  useEffect(() => {
    try {
      window.localStorage.setItem(`${storageKey}:mode`, mode);
    } catch {
      // Ignore storage restrictions.
    }
  }, [mode, storageKey]);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        `${storageKey}:panels`,
        JSON.stringify({ left: leftOpen, right: rightOpen }),
      );
    } catch {
      // Ignore storage restrictions.
    }
  }, [leftOpen, rightOpen, storageKey]);

  useEffect(() => {
    activeFieldRef.current = null;
  }, [selectedSlot]);

  useEffect(() => {
    if (!selectedBlock) {
      setDraft("");
      return;
    }
    setDraft(JSON.stringify(content[selectedBlock.slot] ?? {}, null, 2));
    setDraftError("");
  }, [selectedBlock, content]);

  useEffect(() => {
    if (!hydrated || !capabilities.supported) return;
    const timer = window.setTimeout(() => {
      window.localStorage.setItem(storageKey, JSON.stringify(snapshot));
      setStatus("Tersimpan");
    }, 400);
    return () => window.clearTimeout(timer);
  }, [capabilities.supported, hydrated, snapshot, storageKey]);

  useEffect(() => {
    if (!hydrated || !capabilities.supported) return;
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setIsRendering(true);
      setRenderError(false);
      try {
        const response = await fetch(
          projectId
            ? `/api/projects/${projectId}/site/render`
            : `/api/workspace/${id}/render`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...snapshot, pageId }),
          },
        );
        if (!response.ok) throw new Error("render");
        const next = await response.text();
        if (!cancelled) {
          setHtml(next);
          setRenderError(false);
        }
      } catch {
        if (!cancelled) {
          setStatus("Render gagal");
          setRenderError(true);
        }
      } finally {
        if (!cancelled) setIsRendering(false);
      }
    }, 200);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [capabilities.supported, hydrated, id, pageId, projectId, snapshot, renderNonce]);

  useEffect(() => {
    if (!hydrated || !projectId || !capabilities.supported) return;
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      const sections = blocks.map((block) => ({
        code: block.slot,
        name: block.slot,
        enabled: block.enabled,
        order: block.order,
        variantId: block.variant,
        ...(content[block.slot] && typeof content[block.slot] === "object"
          ? { content: content[block.slot] }
          : {}),
      }));
      try {
        setStatus("Menyimpan");
        const response = await fetch(`/api/projects/${projectId}/site`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sections,
            pageId,
            themeId,
            tier,
            compositionId: id,
          }),
        });
        if (!response.ok) throw new Error("save");
        if (!cancelled) setStatus("Tersimpan");
      } catch {
        if (!cancelled) setStatus("Gagal menyimpan");
      }
    }, 700);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [blocks, capabilities.supported, content, hydrated, id, pageId, projectId, themeId, tier]);

  function commit(next: Partial<Snapshot>) {
    timeline.commit(snapshot);
    if (next.themeId !== undefined) setThemeId(next.themeId);
    if (next.tier !== undefined) setTier(next.tier);
    if (next.blocks !== undefined) setBlocks(next.blocks);
    if (next.content !== undefined) setContent(next.content);
  }

  function undo() {
    if (!can("undo.redo")) return;
    const previous = timeline.undo(snapshot);
    if (!previous) return;
    setThemeId(previous.themeId);
    setTier(previous.tier);
    setBlocks(previous.blocks);
    setContent(previous.content);
  }

  function redo() {
    if (!can("undo.redo")) return;
    const next = timeline.redo(snapshot);
    if (!next) return;
    setThemeId(next.themeId);
    setTier(next.tier);
    setBlocks(next.blocks);
    setContent(next.content);
  }

  function restoreVersion(version: VersionEntry) {
    if (!can("section.content.edit")) return;
    setRestoringVersion(version.version);
    const blocksRestore: WorkspaceBlock[] = version.sections.map(
      (section, index) => ({
        slot: section.code,
        variant: section.variantId ?? "default",
        enabled: section.enabled !== false,
        order: section.order ?? index + 1,
      }),
    );
    const contentRestore: Record<string, unknown> = Object.fromEntries(
      version.sections.map((section) => [section.code, section.content ?? {}]),
    );
    // Restore applies into state; autosave persists it and records a new version.
    commit({
      blocks: blocksRestore,
      content: contentRestore,
      themeId: version.themeId,
      tier: version.tier,
    });
    setTimeout(() => {
      setRestoringVersion(null);
      setVersionsOpen(false);
    }, 400);
  }

  function move(slot: string, direction: -1 | 1) {
    if (!can("section.reorder")) return;
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
    if (!can("section.toggle")) return;
    commit({
      blocks: blocks.map((block) =>
        block.slot === slot ? { ...block, enabled: !block.enabled } : block,
      ),
    });
  }

  function changeVariant(slot: string, variant: string) {
    if (!can("section.variant.select")) return;
    commit({
      blocks: blocks.map((block) =>
        block.slot === slot ? { ...block, variant } : block,
      ),
    });
  }

  function editField(path: string[], value: string) {
    if (!can("section.content.edit")) return;
    if (!selectedBlock) return;
    const fieldId = `${selectedBlock.slot}:${path.join(".")}`;
    const current = (content[selectedBlock.slot] ?? {}) as Record<string, unknown>;
    const nextSlot = setFieldValue(current, path, value);
    if (activeFieldRef.current !== fieldId) {
      activeFieldRef.current = fieldId;
      timeline.commit(snapshot);
    }
    setContent({ ...content, [selectedBlock.slot]: nextSlot });
    setStatus("Konten diubah");
  }

  function endFieldEdit() {
    activeFieldRef.current = null;
  }

  function applyAsset(asset: ProjectAsset) {
    if (!can("media.apply")) return;
    if (!selectedBlock) return;
    const current = (content[selectedBlock.slot] ?? {}) as Record<string, unknown>;
    commit({
      content: {
        ...content,
        [selectedBlock.slot]: {
          ...current,
          media: { src: asset.url, alt: asset.name },
        },
      },
    });
    setStatus("Asset diterapkan");
  }

  async function uploadAsset(file: File) {
    if (!can("media.upload")) return;
    if (!projectId) return;
    setUploading(true);
    try {
      const asset = await api.projects.uploadAsset(projectId, file);
      setAssets((current) => [asset, ...current]);
      setStatus("Asset diunggah");
    } catch {
      setStatus("Gagal mengunggah asset");
    } finally {
      setUploading(false);
    }
  }

  function applyContent() {
    if (!can("section.content.edit")) return;
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
    if (!can("canvas.select")) return;
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
    <CollabProvider config={collabConfig}>
      <div className="flex h-full min-h-0 flex-col gap-4 p-4">
        {!capabilities.supported ? (
        <div
          data-testid="workspace-capability-notice"
          role="alert"
          className="shrink-0 rounded-lg border border-danger/40 bg-danger/5 p-3 text-sm text-danger"
        >
          {capabilities.reason}
        </div>
      ) : null}
      <div className="relative flex shrink-0 flex-wrap items-center gap-3 rounded-lg border border-line bg-surface p-3">
        <div className="mr-auto min-w-0">
          <p className="truncate text-sm font-semibold text-ink">
            {data.composition.display_name}
          </p>
          <p className="truncate text-xs text-muted">
            {data.composition.composition_id}
          </p>
        </div>
        <label className="flex items-center gap-2 text-xs text-muted">
          Theme
          <select
            className="rounded-md border border-line bg-paper px-2 py-1 text-sm text-ink"
            value={themeId}
            disabled={!can("theme.select")}
            title={unsupportedReason("theme.select")}
            onChange={(event) => {
              if (can("theme.select")) commit({ themeId: event.target.value });
            }}
          >
            {themes.map((theme) => (
              <option key={theme.theme_id} value={theme.theme_id}>
                {theme.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 text-xs text-muted">
          Tier
          <select
            className="rounded-md border border-line bg-paper px-2 py-1 text-sm text-ink"
            value={tier}
            disabled={!can("tier.select")}
            title={unsupportedReason("tier.select")}
            onChange={(event) => {
              if (!can("tier.select")) return;
              commit({
                tier: event.target.value as WorkspaceComposition["tier"],
              });
            }}
          >
            {["BASIC", "PRO", "AGENCY"].map((value) => (
              <option key={value} value={value}>
                {tierLabel(value)}
              </option>
            ))}
          </select>
        </label>
        <div
          role="group"
          aria-label="Perangkat"
          className="flex items-center gap-0.5 rounded-md border border-line bg-paper p-0.5"
        >
          {Object.entries(DEVICES).map(([key, value]) => {
            const Icon =
              key === "desktop" ? Monitor : key === "tablet" ? Tablet : Smartphone;
            const active = device === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setDevice(key as Device)}
                aria-pressed={active}
                aria-label={value.label}
                title={value.label}
                className={`grid h-8 w-8 place-items-center rounded transition-colors duration-150 ${
                  active
                    ? "bg-accent-soft text-accent"
                    : "text-muted hover:bg-surface hover:text-ink"
                }`}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-0.5 rounded-md border border-line bg-paper p-0.5">
          <button
            type="button"
            onClick={undo}
            disabled={!timeline.canUndo || !can("undo.redo")}
            aria-label="Undo"
            title={unsupportedReason("undo.redo") ?? "Undo"}
            className="grid h-8 w-8 place-items-center rounded text-muted transition-colors duration-150 hover:bg-surface hover:text-ink disabled:opacity-40"
          >
            <Undo2 className="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={redo}
            disabled={!timeline.canRedo || !can("undo.redo")}
            aria-label="Redo"
            title={unsupportedReason("undo.redo") ?? "Redo"}
            className="grid h-8 w-8 place-items-center rounded text-muted transition-colors duration-150 hover:bg-surface hover:text-ink disabled:opacity-40"
          >
            <Redo2 className="h-4 w-4" aria-hidden="true" />
          </button>
          {projectId ? (
            <span className="mx-1 h-5 w-px bg-line" aria-hidden="true" />
          ) : null}
          {projectId ? (
            <button
              type="button"
              onClick={() => setVersionsOpen((open) => !open)}
              aria-expanded={versionsOpen}
              aria-label="Riwayat versi"
              title="Riwayat versi"
              data-testid="workspace-version-history-toggle"
              className={`grid h-8 w-8 place-items-center rounded transition-colors duration-150 ${
                versionsOpen
                  ? "bg-accent-soft text-accent"
                  : "text-muted hover:bg-surface hover:text-ink"
              }`}
            >
              <History className="h-4 w-4" aria-hidden="true" />
            </button>
          ) : null}
        </div>
        <div
          role="group"
          aria-label="Mode edit"
          className="flex items-center gap-0.5 rounded-md border border-line bg-paper p-0.5"
        >
          {(["simple", "pro"] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setMode(value)}
              aria-pressed={mode === value}
              className={`rounded px-2 py-1 text-xs font-medium transition-colors duration-150 ${
                mode === value
                  ? "bg-accent-soft text-accent"
                  : "text-muted hover:text-ink"
              }`}
            >
              {value === "simple" ? "Simple" : "Pro"}
            </button>
          ))}
        </div>
        <span className="flex items-center gap-1.5 text-xs text-muted">
          <span
            className="h-1.5 w-1.5 rounded-full bg-success"
            aria-hidden="true"
          />
          {status}
        </span>
        {projectId ? (
          <VersionHistoryPanel
            projectId={projectId}
            pageId={pageId}
            open={versionsOpen}
            onClose={() => setVersionsOpen(false)}
            onRestore={restoreVersion}
            restoringVersion={restoringVersion}
          />
        ) : null}
      </div>

      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[auto_minmax(0,1fr)_auto]">
        <aside
          data-testid="workspace-outline"
          className={`min-h-0 overflow-auto rounded-lg border border-line bg-surface ${
            leftOpen ? "w-full p-3 lg:w-64" : "w-full p-1 lg:w-12"
          }`}
        >
          {leftOpen ? (
            <>
              <div className="mb-3 flex items-center justify-between gap-2">
                <h2 className="text-sm font-semibold text-ink">Sections</h2>
                <button
                  type="button"
                  onClick={() => setLeftOpen(false)}
                  aria-label="Ciutkan panel sections"
                  title="Ciutkan sections"
                  className="grid h-9 w-9 place-items-center rounded-md text-muted transition-colors duration-150 hover:bg-paper hover:text-ink"
                >
                  <PanelLeftClose className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
              {mode === "pro" ? (
                <div
                  role="group"
                  aria-label="Panel kiri"
                  className="mb-3 flex gap-0.5 rounded-md border border-line bg-paper p-0.5"
                >
                  {LEFT_TABS.map(({ id, label, Icon }) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setLeftTab(id)}
                      aria-pressed={leftTab === id}
                      title={label}
                      className={`flex flex-1 items-center justify-center gap-1 rounded px-1 py-1 text-[11px] font-medium transition-colors duration-150 ${
                        leftTab === id
                          ? "bg-accent-soft text-accent"
                          : "text-muted hover:text-ink"
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>{label}</span>
                    </button>
                  ))}
                </div>
              ) : null}
              {mode === "simple" || leftTab === "sections" ? (
                <ul className="space-y-1">
                  {[...blocks]
                    .sort((a, b) => a.order - b.order)
                    .map((block, index, ordered) => {
                      const active = selectedSlot === block.slot;
                      const blockVariants = variantsFor(block.slot);
                      const variantName =
                        blockVariants.find((item) => item.code === block.variant)
                          ?.name ?? block.variant;
                      const slotLabel = data.slots[block.slot]?.name ?? block.slot;
                      return (
                        <li
                          key={block.slot}
                          className={`rounded-md ${
                            active ? "bg-accent-soft" : "hover:bg-paper"
                          }`}
                        >
                          <div className="flex items-center gap-0.5 px-1.5 py-1">
                            <button
                              type="button"
                              onClick={() => setSelectedSlot(block.slot)}
                              aria-pressed={active}
                              className="min-w-0 flex-1 text-left"
                            >
                              <span
                                className={`block truncate text-xs font-medium ${
                                  active ? "text-accent" : "text-ink"
                                }`}
                              >
                                {slotLabel}
                              </span>
                              <span className="block truncate text-[11px] text-muted">
                                {variantName}
                                {!block.enabled ? " · nonaktif" : ""}
                              </span>
                            </button>
                            <button
                              type="button"
                              onClick={() => toggle(block.slot)}
                              disabled={!can("section.toggle")}
                              aria-label={
                                block.enabled
                                  ? `Sembunyikan ${block.slot}`
                                  : `Tampilkan ${block.slot}`
                              }
                              title={
                                unsupportedReason("section.toggle") ??
                                (block.enabled ? "Sembunyikan" : "Tampilkan")
                              }
                              className="grid h-7 w-7 place-items-center rounded text-muted transition-colors duration-150 hover:bg-surface hover:text-ink disabled:opacity-40"
                            >
                              {block.enabled ? (
                                <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                              ) : (
                                <EyeOff className="h-3.5 w-3.5" aria-hidden="true" />
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={() => move(block.slot, -1)}
                              disabled={
                                !can("section.reorder") ||
                                index < 1 ||
                                index >= ordered.length - 1
                              }
                              aria-label={`Naikkan ${block.slot}`}
                              title={unsupportedReason("section.reorder") ?? "Naikkan"}
                              className="grid h-7 w-7 place-items-center rounded text-muted transition-colors duration-150 hover:bg-surface hover:text-ink disabled:opacity-30"
                            >
                              <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
                            </button>
                            <button
                              type="button"
                              onClick={() => move(block.slot, 1)}
                              disabled={
                                !can("section.reorder") ||
                                index < 1 ||
                                index >= ordered.length - 1
                              }
                              aria-label={`Turunkan ${block.slot}`}
                              title={unsupportedReason("section.reorder") ?? "Turunkan"}
                              className="grid h-7 w-7 place-items-center rounded text-muted transition-colors duration-150 hover:bg-surface hover:text-ink disabled:opacity-30"
                            >
                              <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
                            </button>
                          </div>
                          {active && blockVariants.length ? (
                            <div
                              role="group"
                              aria-label={`Varian ${block.slot}`}
                              className="flex flex-wrap gap-1 px-1.5 pb-1.5"
                            >
                              {blockVariants.map((variant) => {
                                const chosen = block.variant === variant.code;
                                return (
                                  <button
                                    key={variant.code}
                                    type="button"
                                    onClick={() =>
                                      changeVariant(block.slot, variant.code)
                                    }
                                    disabled={!can("section.variant.select")}
                                    aria-pressed={chosen}
                                    title={unsupportedReason(
                                      "section.variant.select",
                                    )}
                                    className={`rounded-full border px-2 py-0.5 text-[11px] transition-colors duration-150 ${
                                      chosen
                                        ? "border-accent bg-surface text-accent"
                                        : "border-line text-muted hover:text-ink"
                                    } disabled:opacity-40`}
                                  >
                                    {variant.name}
                                  </button>
                                );
                              })}
                            </div>
                          ) : null}
                        </li>
                      );
                    })}
                </ul>
              ) : leftTab === "pages" ? (
                projectId && pageId ? (
                  <PagesPanel
                    key={pageId}
                    projectId={projectId}
                    pages={pages}
                    currentPageId={pageId}
                    capabilities={capabilities}
                  />
                ) : (
                  <p className="text-xs text-muted">
                    Buka project untuk mengelola halaman.
                  </p>
                )
              ) : projectId ? (
                <SiteSettingsPanel
                  projectId={projectId}
                  siteSettings={siteSettings}
                  capabilities={capabilities}
                />
              ) : (
                <p className="text-xs text-muted">
                  Pengaturan global tersedia di halaman project.
                </p>
              )}
            </>
          ) : (
            <button
              type="button"
              onClick={() => setLeftOpen(true)}
              aria-label="Buka panel sections"
              title="Sections"
              className="mx-auto grid h-9 w-9 place-items-center rounded-md text-muted transition-colors duration-150 hover:bg-paper hover:text-ink"
            >
              <PanelLeftOpen className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
        </aside>

        <div className="relative flex min-h-0 min-w-0 flex-col overflow-hidden bg-paper">
          <div className="pointer-events-none absolute left-3 top-3 z-10 flex max-w-[calc(100%-1.5rem)] items-center gap-2 rounded-none border border-line bg-surface px-3 py-1 text-[11px] text-muted shadow-sm">
            <span className="truncate">
              Canvas
              {selectedBlock
                ? ` · ${data.slots[selectedBlock.slot]?.name ?? selectedBlock.slot} · ${selectedVariantName}`
                : ""}
            </span>
            <span className="shrink-0 font-medium text-ink">
              {DEVICES[device].label}
            </span>
          </div>
          <div className="flex min-h-0 flex-1 justify-center overflow-auto">
            <div
              className="relative h-full min-h-[520px]"
              style={{ width: DEVICES[device].width, maxWidth: "100%" }}
            >
              <iframe
                ref={iframeRef}
                title="Workspace canvas"
                srcDoc={html}
                onLoad={() => {
                  attachSelection();
                  handleScrollLoad();
                }}
                className="h-full w-full min-h-[520px] rounded-none bg-white border border-line"
              />
              <SectionOverlay
                iframeRef={iframeRef}
                selectedSlot={selectedSlot}
                slotLabel={(slot) => data.slots[slot]?.name ?? slot}
                className="absolute inset-0 pointer-events-none"
                selectedToolbar={selectedBlock ? (
                  <SectionToolbar
                    slot={selectedBlock.slot}
                    slotName={data.slots[selectedBlock.slot]?.name ?? selectedBlock.slot}
                    enabled={selectedBlock.enabled}
                    canMoveUp={selectedBlock.order > 0}
                    canMoveDown={selectedBlock.order < 10}
                    canReorder={can("section.reorder")}
                    canVariant={can("section.variant.select")}
                    variants={variantsFor(selectedBlock.slot)}
                    currentVariant={selectedBlock.variant}
                    onMoveUp={() => move(selectedBlock.slot, -1)}
                    onMoveDown={() => move(selectedBlock.slot, 1)}
                    onToggle={() => toggle(selectedBlock.slot)}
                    onVariantChange={(variant) => changeVariant(selectedBlock.slot, variant)}
                  />
                ) : null}
              />
            </div>
            {isRendering && (
              <div
                className="absolute inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm z-20"
                role="status"
                aria-label="Memuat pratinjau"
              >
                <div className="flex flex-col items-center gap-2 text-muted">
                  <RefreshCw className="h-6 w-6 animate-spin text-accent" aria-hidden="true" />
                  <span className="text-sm font-medium">Memuat pratinjau...</span>
                </div>
              </div>
            )}
            {renderError && (
              <div
                className="absolute inset-0 flex items-center justify-center bg-white/90 backdrop-blur-sm z-30 p-4"
                role="alert"
              >
                <div className="text-center max-w-md">
                  <p className="text-sm text-danger mb-2">Gagal memuat pratinjau</p>
                  <button
                    type="button"
                    onClick={() => setRenderNonce((n) => n + 1)}
                    className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-on-accent hover:opacity-90"
                  >
                    Coba lagi
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <aside
          data-testid="workspace-inspector"
          className={`min-h-0 overflow-auto rounded-lg border border-line bg-surface ${
            rightOpen ? "w-full p-3 lg:w-80" : "w-full p-1 lg:w-12"
          }`}
        >
          {rightOpen ? (
            <>
              <div className="mb-3 flex items-center justify-between gap-2">
                <h2 className="text-sm font-semibold text-ink">Inspector</h2>
                <button
                  type="button"
                  onClick={() => setRightOpen(false)}
                  aria-label="Ciutkan panel inspector"
                  title="Ciutkan inspector"
                  className="grid h-9 w-9 place-items-center rounded-md text-muted transition-colors duration-150 hover:bg-paper hover:text-ink"
                >
                  <PanelRightClose className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
              {selectedBlock ? (
                <div className="space-y-4">
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-muted">Slot</p>
                    <p className="text-sm font-medium text-ink">
                      {data.slots[selectedBlock.slot]?.name ?? selectedBlock.slot}
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs text-muted">
                      Variant
                      <select
                        className="mt-1 w-full rounded-md border border-line bg-paper px-2 py-1 text-sm text-ink"
                        value={selectedBlock.variant}
                        disabled={!can("section.variant.select")}
                        title={unsupportedReason("section.variant.select")}
                        onChange={(event) =>
                          changeVariant(selectedBlock.slot, event.target.value)
                        }
                      >
                        {variants.map((variant: WorkspaceVariant) => (
                          <option key={variant.code} value={variant.code}>
                            {variant.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    {variants.length ? (
                      <div
                        role="group"
                        aria-label="Pilihan varian"
                        className="mt-2 flex flex-wrap gap-1"
                      >
                        {variants.map((variant: WorkspaceVariant) => {
                          const chosen = selectedBlock.variant === variant.code;
                          return (
                            <button
                              key={variant.code}
                              type="button"
                              onClick={() =>
                                changeVariant(selectedBlock.slot, variant.code)
                              }
                              disabled={!can("section.variant.select")}
                              aria-pressed={chosen}
                              title={unsupportedReason("section.variant.select")}
                              className={`rounded-full border px-2 py-0.5 text-[11px] transition-colors duration-150 ${
                                chosen
                                  ? "border-accent bg-accent-soft text-accent"
                                  : "border-line text-muted hover:text-ink"
                              } disabled:opacity-40`}
                            >
                              {variant.name}
                            </button>
                          );
                        })}
                      </div>
                    ) : null}
                  </div>
                  {friendlyFields.length ? (
                    <div
                      className="space-y-3 border-t border-line pt-3"
                      data-testid="workspace-friendly-fields"
                    >
                      {friendlyFields.map((field) => {
                        const fieldId = `workspace-field-${selectedBlock.slot}-${field.path.join("-")}`;
                        const sharedProps = {
                          id: fieldId,
                          "data-testid": fieldId,
                          value: field.value,
                          disabled: !can("section.content.edit"),
                          title: unsupportedReason("section.content.edit"),
                          onChange: (
                            event: ChangeEvent<
                              HTMLInputElement | HTMLTextAreaElement
                            >,
                          ) => editField(field.path, event.target.value),
                          onBlur: endFieldEdit,
                          className:
                            "mt-1 w-full rounded-md border border-line bg-paper px-2 py-1 text-sm text-ink disabled:opacity-60",
                        };
                        return (
                          <label
                            key={fieldId}
                            htmlFor={fieldId}
                            className="block text-xs text-muted"
                          >
                            {field.label}
                            {field.multiline ? (
                              <textarea
                                {...sharedProps}
                                rows={2}
                                className={`${sharedProps.className} min-h-[64px]`}
                              />
                            ) : (
                              <input {...sharedProps} type="text" />
                            )}
                          </label>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="border-t border-line pt-3 text-xs text-muted">
                      Slot ini tidak memiliki field teks sederhana. Gunakan editor
                      JSON lanjutan di bawah untuk mengubah strukturnya.
                    </p>
                  )}
                  <details
                    data-testid="workspace-advanced-editor"
                    className="border-t border-line pt-3"
                  >
                    <summary className="cursor-pointer text-xs font-medium text-ink">
                      Editor JSON lanjutan
                    </summary>
                    <div className="mt-2 space-y-2">
                      <p className="text-xs text-muted">
                        Untuk array atau struktur non-teks. Perubahan di sini
                        menggantikan seluruh isi slot.
                      </p>
                      <label className="block text-xs text-muted">
                        Konten JSON
                        <textarea
                          data-testid="workspace-inspector-content"
                          className="mt-1 h-64 w-full rounded-md border border-line bg-paper p-2 font-mono text-xs text-ink disabled:opacity-60"
                          value={draft}
                          disabled={!can("section.content.edit")}
                          title={unsupportedReason("section.content.edit")}
                          onChange={(event) => setDraft(event.target.value)}
                          spellCheck={false}
                        />
                      </label>
                      {draftError ? (
                        <p className="text-xs text-danger">{draftError}</p>
                      ) : null}
                      <button
                        type="button"
                        onClick={applyContent}
                        disabled={!can("section.content.edit")}
                        title={unsupportedReason("section.content.edit")}
                        className="rounded-md bg-accent px-3 py-2 text-sm font-medium text-on-accent disabled:opacity-50"
                      >
                        Terapkan JSON
                      </button>
                    </div>
                  </details>
                  {mode === "pro" && projectId ? (
                    <div className="border-t border-line pt-3">
                      <p className="text-xs font-medium text-ink">Assets</p>
                      <label
                        className={`mt-2 inline-flex cursor-pointer rounded-md border border-line px-3 py-2 text-xs font-medium text-ink ${
                          can("media.upload")
                            ? "hover:border-ink/40"
                            : "cursor-not-allowed opacity-60"
                        }`}
                        aria-disabled={!can("media.upload")}
                        title={unsupportedReason("media.upload")}
                      >
                        {uploading ? "Mengunggah..." : "Upload gambar"}
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp,image/svg+xml"
                          className="sr-only"
                          disabled={uploading || !can("media.upload")}
                          onChange={(event) => {
                            const file = event.target.files?.[0];
                            if (file) void uploadAsset(file);
                            event.target.value = "";
                          }}
                        />
                      </label>
                      <ul className="mt-3 space-y-2">
                        {assets.slice(0, 6).map((asset) => (
                          <li
                            key={asset.id}
                            className="flex items-center justify-between gap-2 rounded border border-line px-2 py-1.5"
                          >
                            <span className="truncate text-xs text-muted">
                              {asset.name}
                            </span>
                            <button
                              type="button"
                              onClick={() => applyAsset(asset)}
                              disabled={!can("media.apply")}
                              title={unsupportedReason("media.apply")}
                              className="text-xs font-medium text-accent hover:underline disabled:opacity-40"
                            >
                              Gunakan
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
              ) : (
                <p className="text-sm text-muted">
                  Pilih section di daftar atau kanvas.
                </p>
              )}
            </>
          ) : (
            <button
              type="button"
              onClick={() => setRightOpen(true)}
              aria-label="Buka panel inspector"
              title="Inspector"
              className="mx-auto grid h-9 w-9 place-items-center rounded-md text-muted transition-colors duration-150 hover:bg-paper hover:text-ink"
            >
              <PanelRightOpen className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
        </aside>
      </div>
    </div>
    </CollabProvider>
  );
}
