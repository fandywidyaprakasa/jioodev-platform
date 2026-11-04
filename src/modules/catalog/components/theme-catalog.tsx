"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { api } from "@/shared/lib/api";
import { Badge, Button, Card, Empty, Input, useToast } from "@/shared/ui";
import type { ProductType, Theme, ThemeTier } from "@/shared/types";

const PRODUCT_LABEL: Record<ProductType, string> = {
  LAND: "Landing",
  WEB: "Website",
  COMM: "Commerce",
};

function themeGradient(style: string) {
  if (style === "VAR") return "from-sky-100 via-white to-amber-50";
  if (style === "MIN") return "from-zinc-100 via-white to-zinc-50";
  return "from-[#f4e4da] via-[#fffcf6] to-[#e3d8c8]";
}

export function ThemeCatalog({
  themes,
  mode = "browse",
  projectId,
  contextNote,
}: {
  themes: Theme[];
  mode?: "browse" | "pick";
  projectId?: string;
  contextNote?: string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [query, setQuery] = useState("");
  const [activeThemeId, setActiveThemeId] = useState<string | null>(
    mode === "pick" ? themes[0]?.themeId ?? null : null,
  );
  const [product, setProduct] = useState<ProductType | null>(
    mode === "pick" ? themes[0]?.products[0]?.type ?? null : null,
  );
  const [tier, setTier] = useState<ThemeTier | null>(null);
  const [selected, setSelected] = useState<string>();
  const [pending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return themes;
    return themes.filter((theme) =>
      `${theme.name} ${theme.description} ${theme.style}`
        .toLowerCase()
        .includes(needle),
    );
  }, [themes, query]);

  const activeTheme = themes.find((theme) => theme.themeId === activeThemeId);
  const activeProduct =
    activeTheme?.products.find((item) => item.type === product) ??
    activeTheme?.products[0];
  const tiers = activeProduct?.tiers ?? [];
  const activeTier = tiers.find((item) => item.tier === tier) ?? tiers[0];
  const versions = activeTier?.variants ?? [];
  const selectedVariant =
    versions.find((variant) => variant.code === selected) ?? versions[0];

  function chooseTheme(theme: Theme) {
    setActiveThemeId(theme.themeId);
    setProduct(theme.products[0]?.type ?? null);
    setTier(null);
    setSelected(undefined);
  }

  function useVariant() {
    if (!projectId || !selectedVariant) return;
    startTransition(async () => {
      try {
        await api.projects.update(projectId, {
          templateCode: selectedVariant.code,
          status: "TEMPLATE_CHOSEN",
        });
        toast({
          title: "Varian dipilih",
          description: `${activeTheme?.name ?? "Theme"} · ${selectedVariant.variantLabel ?? selectedVariant.name}`,
        });
        router.push(`/app/projects/${projectId}/generate`);
      } catch (error) {
        toast({
          title: "Gagal memilih varian",
          description: error instanceof Error ? error.message : "Coba lagi.",
          variant: "error",
        });
      }
    });
  }

  if (!themes.length) {
    return (
      <Empty
        title="Belum ada theme untuk tipe ini"
        description="Katalog untuk tipe produk ini belum siap. Pilih tipe lain atau hubungi admin."
      />
    );
  }

  return (
    <div className="space-y-6">
      {contextNote ? (
        <p className="rounded-md border border-line bg-paper px-3 py-2 text-xs text-muted">
          {contextNote}
        </p>
      ) : null}

      <Input
        label="Cari theme"
        placeholder="Nama theme, gaya, atau kata kunci"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((theme) => {
          const active = theme.themeId === activeThemeId;
          const content = (
            <>
              <div className="relative aspect-[16/10] overflow-hidden border-b border-line">
                {theme.thumbnailUrl ? (
                  <Image
                    src={theme.thumbnailUrl}
                    alt={`Thumbnail ${theme.name}`}
                    fill
                    sizes="(max-width: 768px) 100vw, 380px"
                    className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                  />
                ) : (
                  <div
                    className={`h-full w-full bg-gradient-to-br ${themeGradient(theme.style)}`}
                  />
                )}
              </div>
              <div className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-[15px] font-semibold text-ink">
                      {theme.name}
                    </h2>
                    <p className="mt-1 line-clamp-2 text-sm text-muted">
                      {theme.description}
                    </p>
                  </div>
                  <Badge variant={active ? "accent" : "neutral"}>
                    {theme.style}
                  </Badge>
                </div>
                <p className="mt-3 text-xs text-muted">
                  {theme.variantCount} varian ·{" "}
                  {theme.products.map((item) => PRODUCT_LABEL[item.type]).join(", ")}
                </p>
              </div>
            </>
          );

          if (mode === "browse") {
            return (
              <Link
                key={theme.themeId}
                href={`/templates/theme/${theme.themeId}`}
                className="group overflow-hidden rounded-lg border border-line bg-surface shadow-sm transition-[border-color,box-shadow,transform] duration-150 hover:-translate-y-0.5 hover:border-ink/30 hover:shadow-md"
              >
                {content}
              </Link>
            );
          }

          return (
            <button
              key={theme.themeId}
              type="button"
              onClick={() => chooseTheme(theme)}
              aria-pressed={active}
              className={`group overflow-hidden rounded-lg border bg-surface text-left shadow-sm transition-[border-color,box-shadow] duration-150 ${
                active
                  ? "border-accent shadow-md"
                  : "border-line hover:border-ink/30 hover:shadow-md"
              }`}
            >
              {content}
            </button>
          );
        })}
      </div>

      {mode === "pick" && activeTheme ? (
        <Card
          title={`${activeTheme.name} — pilih varian`}
          description="Pilih tipe produk, tier, lalu varian yang paling sesuai."
        >
          {activeTheme.products.length > 1 ? (
            <div className="mb-4 flex flex-wrap gap-2">
              {activeTheme.products.map((item) => (
                <Button
                  key={item.type}
                  size="sm"
                  variant={item.type === activeProduct?.type ? "primary" : "secondary"}
                  onClick={() => {
                    setProduct(item.type);
                    setTier(null);
                    setSelected(undefined);
                  }}
                >
                  {PRODUCT_LABEL[item.type]}
                </Button>
              ))}
            </div>
          ) : null}

          {tiers.length > 1 ? (
            <div className="mb-4 flex flex-wrap gap-2">
              {tiers.map((item) => (
                <Button
                  key={item.tier}
                  size="sm"
                  variant={item.tier === activeTier?.tier ? "primary" : "secondary"}
                  onClick={() => {
                    setTier(item.tier);
                    setSelected(undefined);
                  }}
                >
                  {item.tier}
                </Button>
              ))}
            </div>
          ) : tiers[0] ? (
            <p className="mb-4 text-xs text-muted">Tier: {tiers[0].tier}</p>
          ) : null}

          <div className="grid gap-4 lg:grid-cols-[1fr_1.15fr]">
            <div className="space-y-2">
              {versions.map((variant) => {
                const active = selectedVariant?.code === variant.code;
                return (
                  <button
                    key={variant.code}
                    type="button"
                    onClick={() => setSelected(variant.code)}
                    aria-pressed={active}
                    className={`w-full rounded-md border px-3 py-2.5 text-left text-sm transition-colors ${
                      active
                        ? "border-accent bg-accent-soft"
                        : "border-line hover:border-ink/30"
                    }`}
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span className="font-medium text-ink">
                        {variant.variantLabel ?? variant.name}
                      </span>
                      <span className="text-[10px] uppercase tracking-wide text-muted">
                        {variant.layout}
                      </span>
                    </span>
                    <span className="mt-1 block text-xs text-muted">
                      {variant.industries.join(", ") || "Umum"}
                      {variant.purposes.length
                        ? ` · ${variant.purposes.join(", ")}`
                        : ""}
                    </span>
                  </button>
                );
              })}
              {!versions.length ? (
                <p className="text-sm text-muted">
                  Tidak ada varian pada tier ini.
                </p>
              ) : null}
            </div>

            <div className="overflow-hidden rounded-lg border border-line bg-paper">
              {selectedVariant ? (
                <>
                  <div className="flex items-center justify-between border-b border-line px-3 py-2 text-xs text-muted">
                    <span>{selectedVariant.variantLabel ?? selectedVariant.name}</span>
                    <a
                      href={selectedVariant.previewUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="font-medium text-accent hover:underline"
                    >
                      Buka preview
                    </a>
                  </div>
                  <iframe
                    src={selectedVariant.previewUrl}
                    title={`Preview ${selectedVariant.name}`}
                    className="h-[420px] w-full bg-white"
                    loading="lazy"
                  />
                </>
              ) : (
                <p className="p-4 text-sm text-muted">Pilih varian untuk preview.</p>
              )}
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
            <p className="text-sm text-muted">
              {selectedVariant
                ? `Dipilih: ${activeTheme.name} · ${selectedVariant.variantLabel ?? selectedVariant.name}`
                : "Belum ada varian dipilih."}
            </p>
            <Button onClick={useVariant} disabled={!selectedVariant} loading={pending}>
              Gunakan Varian
            </Button>
          </div>
        </Card>
      ) : null}
    </div>
  );
}
