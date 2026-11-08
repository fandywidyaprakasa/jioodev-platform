"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import {
  DEFAULT_WORKSPACE_EDITOR_CAPABILITIES,
  type WorkspaceEditorCapabilities,
} from "./workspace-capabilities";

export interface WorkspacePageSummary {
  id: string;
  title: string;
  slug: string;
  isHome: boolean;
  order: number;
  seo?: Record<string, unknown>;
  settings?: Record<string, unknown>;
}

export function PagesPanel({
  projectId,
  pages,
  currentPageId,
  capabilities = DEFAULT_WORKSPACE_EDITOR_CAPABILITIES,
}: {
  projectId: string;
  pages: WorkspacePageSummary[];
  currentPageId: string;
  capabilities?: WorkspaceEditorCapabilities;
}) {
  const router = useRouter();
  const can = capabilities.isSupported;
  const unsupportedReason = (
    operation: "page.create" | "page.update" | "page.delete" | "page.reorder",
  ) => (can(operation) ? undefined : (capabilities.reasonFor(operation) ?? undefined));
  const current = pages.find((page) => page.id === currentPageId);
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [settingsTitle, setSettingsTitle] = useState(current?.title ?? "");
  const [settingsSlug, setSettingsSlug] = useState(current?.slug ?? "");
  const [seoTitle, setSeoTitle] = useState(
    typeof current?.seo?.title === "string" ? current.seo.title : "",
  );
  const [seoDescription, setSeoDescription] = useState(
    typeof current?.seo?.description === "string" ? current.seo.description : "",
  );
  const [noindex, setNoindex] = useState(Boolean(current?.seo?.noindex));
  const [hidden, setHidden] = useState(Boolean(current?.settings?.hidden));
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();

  const seo = useMemo(
    () => ({ ...(current?.seo ?? {}), title: seoTitle, description: seoDescription, noindex }),
    [current?.seo, seoTitle, seoDescription, noindex],
  );
  const settings = useMemo(
    () => ({ ...(current?.settings ?? {}), hidden }),
    [current?.settings, hidden],
  );

  function go(pageId: string) {
    router.push(`/app/projects/${projectId}/workspace?page=${pageId}`);
  }

  async function createPage() {
    if (!can("page.create")) return;
    setMessage("");
    const response = await fetch(`/api/projects/${projectId}/pages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, slug }),
    });
    const body = (await response.json().catch(() => null)) as
      | { page?: { id: string }; error?: { message?: string } }
      | null;
    if (!response.ok || !body?.page) {
      setMessage(body?.error?.message ?? "Gagal membuat halaman.");
      return;
    }
    setShowCreate(false);
    setTitle("");
    setSlug("");
    go(body.page.id);
  }

  async function savePage() {
    if (!can("page.update")) return;
    if (!current) return;
    setMessage("");
    const response = await fetch(
      `/api/projects/${projectId}/pages/${current.id}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: settingsTitle,
          slug: current.isHome ? "" : settingsSlug,
          seo,
          settings: { ...settings, hidden: current.isHome ? false : hidden },
        }),
      },
    );
    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as
        | { error?: { message?: string } }
        | null;
      setMessage(body?.error?.message ?? "Gagal menyimpan halaman.");
      return;
    }
    setMessage("Halaman tersimpan.");
    startTransition(() => router.refresh());
  }

  async function movePage(page: WorkspacePageSummary, direction: -1 | 1) {
    if (!can("page.reorder")) return;
    if (page.isHome) return;
    const ordered = pages
      .slice()
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    const index = ordered.findIndex((item) => item.id === page.id);
    const target = ordered[index + direction];
    if (!target || target.isHome) return;
    await Promise.all([
      fetch(`/api/projects/${projectId}/pages/${page.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order: target.order }),
      }),
      fetch(`/api/projects/${projectId}/pages/${target.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order: page.order }),
      }),
    ]);
    startTransition(() => router.refresh());
  }

  async function deletePage() {
    if (!can("page.delete")) return;
    if (!current || current.isHome) return;
    if (!window.confirm(`Hapus halaman "${current.title}"?`)) return;
    const response = await fetch(
      `/api/projects/${projectId}/pages/${current.id}`,
      { method: "DELETE" },
    );
    if (!response.ok) {
      setMessage("Gagal menghapus halaman.");
      return;
    }
    const home = pages.find((page) => page.isHome) ?? pages[0];
    if (home) go(home.id);
  }

  return (
    <section data-testid="workspace-pages" className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-ink">Pages</h2>
        <button
          type="button"
          onClick={() => setShowCreate((value) => !value)}
          disabled={!can("page.create")}
          title={unsupportedReason("page.create")}
          className="rounded border border-line px-2 py-1 text-xs text-muted hover:border-ink/40 disabled:opacity-40"
        >
          + Halaman
        </button>
      </div>

      <ul className="space-y-1">
        {pages.map((page) => (
          <li key={page.id} className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => go(page.id)}
              className={`flex min-w-0 flex-1 items-center justify-between rounded-md border px-2 py-1.5 text-left text-xs ${
                page.id === currentPageId
                  ? "border-accent bg-accent-soft text-accent"
                  : "border-line text-ink"
              }`}
            >
              <span className="truncate">
                {page.title}
                {page.settings?.hidden ? " · hidden" : ""}
              </span>
              <span className="text-muted">{page.isHome ? "/" : `/${page.slug}`}</span>
            </button>
            {!page.isHome ? (
              <>
                <button
                  type="button"
                  onClick={() => void movePage(page, -1)}
                  disabled={!can("page.reorder")}
                  title={unsupportedReason("page.reorder")}
                  className="rounded border border-line px-1 text-xs text-muted disabled:opacity-40"
                  aria-label={`Naikkan ${page.title}`}
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => void movePage(page, 1)}
                  disabled={!can("page.reorder")}
                  title={unsupportedReason("page.reorder")}
                  className="rounded border border-line px-1 text-xs text-muted disabled:opacity-40"
                  aria-label={`Turunkan ${page.title}`}
                >
                  ↓
                </button>
              </>
            ) : null}
          </li>
        ))}
      </ul>

      {showCreate ? (
        <div className="space-y-2 rounded-md border border-line p-2">
          <input
            className="w-full rounded border border-line bg-paper px-2 py-1 text-xs text-ink disabled:opacity-60"
            placeholder="Judul halaman"
            value={title}
            disabled={!can("page.create")}
            title={unsupportedReason("page.create")}
            onChange={(event) => setTitle(event.target.value)}
          />
          <input
            className="w-full rounded border border-line bg-paper px-2 py-1 text-xs text-ink disabled:opacity-60"
            placeholder="Slug, mis. about"
            value={slug}
            disabled={!can("page.create")}
            title={unsupportedReason("page.create")}
            onChange={(event) => setSlug(event.target.value)}
          />
          <button
            type="button"
            onClick={() => void createPage()}
            disabled={!can("page.create")}
            title={unsupportedReason("page.create")}
            className="rounded bg-accent px-2 py-1 text-xs font-medium text-on-accent disabled:opacity-50"
          >
            Buat halaman
          </button>
        </div>
      ) : null}

      {current ? (
        <details className="rounded-md border border-line p-2">
          <summary className="cursor-pointer text-xs font-medium text-ink">
            Page settings
          </summary>
          <div className="mt-2 space-y-2">
            <input
              className="w-full rounded border border-line bg-paper px-2 py-1 text-xs text-ink disabled:opacity-60"
              value={settingsTitle}
              disabled={!can("page.update")}
              title={unsupportedReason("page.update")}
              onChange={(event) => setSettingsTitle(event.target.value)}
              aria-label="Judul halaman"
            />
            <input
              className="w-full rounded border border-line bg-paper px-2 py-1 text-xs text-ink disabled:opacity-60"
              value={current.isHome ? "" : settingsSlug}
              onChange={(event) => setSettingsSlug(event.target.value)}
              disabled={current.isHome || !can("page.update")}
              title={unsupportedReason("page.update")}
              placeholder="Slug halaman"
              aria-label="Slug halaman"
            />
            <input
              className="w-full rounded border border-line bg-paper px-2 py-1 text-xs text-ink disabled:opacity-60"
              value={seoTitle}
              disabled={!can("page.update")}
              title={unsupportedReason("page.update")}
              onChange={(event) => setSeoTitle(event.target.value)}
              placeholder="SEO title"
              aria-label="SEO title"
            />
            <textarea
              className="h-16 w-full rounded border border-line bg-paper px-2 py-1 text-xs text-ink disabled:opacity-60"
              value={seoDescription}
              disabled={!can("page.update")}
              title={unsupportedReason("page.update")}
              onChange={(event) => setSeoDescription(event.target.value)}
              placeholder="SEO description"
              aria-label="SEO description"
            />
            <label className="flex items-center gap-2 text-xs text-muted">
              <input
                type="checkbox"
                checked={noindex}
                disabled={!can("page.update")}
                title={unsupportedReason("page.update")}
                onChange={(event) => setNoindex(event.target.checked)}
              />
              noindex
            </label>
            <label className="flex items-center justify-between gap-2 text-xs text-muted">
              Visibilitas
              <select
                className="rounded border border-line bg-paper px-2 py-1 text-xs text-ink disabled:opacity-60"
                value={current.isHome ? "PUBLIC" : hidden ? "HIDDEN" : "PUBLIC"}
                onChange={(event) => setHidden(event.target.value === "HIDDEN")}
                disabled={current.isHome || !can("page.update")}
                title={unsupportedReason("page.update")}
                aria-label="Visibilitas halaman"
              >
                <option value="PUBLIC">Public</option>
                <option value="HIDDEN">Hidden</option>
              </select>
            </label>
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => void savePage()}
                disabled={pending || !can("page.update")}
                title={unsupportedReason("page.update")}
                className="rounded bg-accent px-2 py-1 text-xs font-medium text-on-accent disabled:opacity-50"
              >
                Simpan
              </button>
              {!current.isHome ? (
                <button
                  type="button"
                  onClick={() => void deletePage()}
                  disabled={!can("page.delete")}
                  title={unsupportedReason("page.delete")}
                  className="rounded border border-danger/40 px-2 py-1 text-xs text-danger disabled:opacity-40"
                >
                  Hapus
                </button>
              ) : null}
            </div>
          </div>
        </details>
      ) : null}
      {message ? <p className="text-xs text-muted">{message}</p> : null}
    </section>
  );
}
