"use client";

import Link from "next/link";
import { useState } from "react";
import { Badge, Button } from "@/shared/ui";
import type { ProductType, Theme, ThemeTier } from "@/shared/types";

const PRODUCT_LABEL: Record<ProductType, string> = {
  LAND: "Landing",
  WEB: "Website",
  COMM: "Commerce",
};

export function ThemeDetail({ theme }: { theme: Theme }) {
  const [product, setProduct] = useState<ProductType>(
    theme.products[0]?.type ?? "LAND",
  );
  const [tier, setTier] = useState<ThemeTier | null>(null);
  const activeProduct =
    theme.products.find((item) => item.type === product) ?? theme.products[0];
  const tiers = activeProduct?.tiers ?? [];
  const activeTier = tiers.find((item) => item.tier === tier) ?? tiers[0];
  const variants = activeTier?.variants ?? [];
  const [selected, setSelected] = useState<string>();
  const activeVariant =
    variants.find((variant) => variant.code === selected) ?? variants[0];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="accent">{theme.style}</Badge>
        <Badge>{theme.variantCount} varian</Badge>
      </div>

      {theme.products.length > 1 ? (
        <div className="flex flex-wrap gap-2">
          {theme.products.map((item) => (
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
        <div className="flex flex-wrap gap-2">
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
        <p className="text-xs text-muted">Tier: {tiers[0].tier}</p>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[1fr_1.1fr]">
        <div className="space-y-2">
          {variants.map((variant) => {
            const active = activeVariant?.code === variant.code;
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
                </span>
              </button>
            );
          })}
          {!variants.length ? (
            <p className="text-sm text-muted">Belum ada varian pada tier ini.</p>
          ) : null}
        </div>

        <div className="overflow-hidden rounded-lg border border-line bg-paper">
          {activeVariant ? (
            <>
              <div className="flex items-center justify-between border-b border-line px-3 py-2 text-xs text-muted">
                <span>{activeVariant.variantLabel ?? activeVariant.name}</span>
                <Link
                  href={`/templates/${activeVariant.code}`}
                  className="font-medium text-accent hover:underline"
                >
                  Detail varian
                </Link>
              </div>
              <iframe
                src={activeVariant.previewUrl}
                title={`Preview ${activeVariant.name}`}
                className="h-[460px] w-full bg-white"
                loading="lazy"
              />
            </>
          ) : (
            <p className="p-4 text-sm text-muted">Pilih varian untuk preview.</p>
          )}
        </div>
      </div>

      {activeVariant ? (
        <Link
          href={`/templates/${activeVariant.code}`}
          className="inline-flex min-h-12 items-center justify-center rounded-full bg-accent px-5 text-sm font-medium text-on-accent hover:bg-accent-strong"
        >
          Gunakan {activeVariant.variantLabel ?? activeVariant.name}
        </Link>
      ) : null}
    </div>
  );
}
