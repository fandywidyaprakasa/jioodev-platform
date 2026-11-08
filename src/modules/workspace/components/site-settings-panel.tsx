"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import {
  DEFAULT_WORKSPACE_EDITOR_CAPABILITIES,
  type WorkspaceEditorCapabilities,
} from "./workspace-capabilities";

export interface SiteSettingsSummary {
  site_name?: string;
  footer_tagline?: string;
}

export function SiteSettingsPanel({
  projectId,
  siteSettings,
  capabilities = DEFAULT_WORKSPACE_EDITOR_CAPABILITIES,
}: {
  projectId: string;
  siteSettings: SiteSettingsSummary;
  capabilities?: WorkspaceEditorCapabilities;
}) {
  const router = useRouter();
  const can = capabilities.isSupported;
  const unsupportedReason = (operation: "site.settings.edit") =>
    can(operation) ? undefined : (capabilities.reasonFor(operation) ?? undefined);
  const [siteName, setSiteName] = useState(siteSettings.site_name ?? "");
  const [footerTagline, setFooterTagline] = useState(
    siteSettings.footer_tagline ?? "",
  );
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();

  const dirty = useMemo(
    () =>
      siteName !== (siteSettings.site_name ?? "") ||
      footerTagline !== (siteSettings.footer_tagline ?? ""),
    [siteName, footerTagline, siteSettings],
  );

  async function save() {
    if (!can("site.settings.edit")) return;
    setMessage("");
    const response = await fetch(`/api/projects/${projectId}/site/settings`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ siteName, footerTagline }),
    });
    if (!response.ok) {
      setMessage("Gagal menyimpan site settings.");
      return;
    }
    setMessage("Site settings tersimpan.");
    startTransition(() => router.refresh());
  }

  return (
    <section data-testid="workspace-site-settings" className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-ink">Site settings</h2>
        <span className="text-[10px] uppercase tracking-wide text-muted">Global</span>
      </div>
      <label className="block text-xs text-muted">
        Site name
        <input
          className="mt-1 w-full rounded-md border border-line bg-paper px-2 py-1 text-xs text-ink disabled:opacity-60"
          value={siteName}
          disabled={!can("site.settings.edit")}
          title={unsupportedReason("site.settings.edit")}
          onChange={(event) => setSiteName(event.target.value)}
          placeholder="Nama website"
          aria-label="Site name"
        />
      </label>
      <label className="block text-xs text-muted">
        Footer tagline
        <input
          className="mt-1 w-full rounded-md border border-line bg-paper px-2 py-1 text-xs text-ink disabled:opacity-60"
          value={footerTagline}
          disabled={!can("site.settings.edit")}
          title={unsupportedReason("site.settings.edit")}
          onChange={(event) => setFooterTagline(event.target.value)}
          placeholder="Tagline footer"
          aria-label="Footer tagline"
        />
      </label>
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => void save()}
          disabled={pending || !dirty || !can("site.settings.edit")}
          title={unsupportedReason("site.settings.edit")}
          className="rounded bg-accent px-2 py-1 text-xs font-medium text-on-accent disabled:opacity-50"
        >
          Simpan
        </button>
        {message ? <span className="text-xs text-muted">{message}</span> : null}
      </div>
      <p className="text-[10px] leading-4 text-muted">
        Theme/tier berlaku untuk semua halaman. Nama dan tagline diterapkan ke footer
        setiap halaman.
      </p>
    </section>
  );
}
