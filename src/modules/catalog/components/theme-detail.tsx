"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Badge, Button } from "@/shared/ui";
import {
  industryLabels,
  layoutLabel,
  productLabel,
  styleLabel,
  tierLabel,
} from "@/shared/lib/taxonomy";
import type { ProductType, Theme, ThemeTier } from "@/shared/types";

function themeGradient(style: string) {
  if (style === "VAR") return "from-sky-100 via-white to-amber-50";
  if (style === "MIN") return "from-zinc-100 via-white to-zinc-50";
  return "from-[#f4e4da] via-[#fffcf6] to-[#e3d8c8]";
}

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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="accent">{styleLabel(theme.style)}</Badge>
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
              {productLabel(item.type)}
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
              {tierLabel(item.tier)}
            </Button>
          ))}
        </div>
      ) : tiers[0] ? (
        <p className="text-xs text-muted">Tier: {tierLabel(tiers[0].tier)}</p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {variants.map((variant) => {
          const active = variant.code === selected;
          return (
            <Link
              key={variant.code}
              href={`/templates/${variant.code}`}
              onMouseEnter={() => setSelected(variant.code)}
              className={`group overflow-hidden rounded-lg border bg-surface shadow-sm transition-[border-color,box-shadow,transform] duration-150 hover:-translate-y-0.5 hover:border-ink/30 hover:shadow-md ${
                active ? "border-accent" : "border-line"
              }`}
            >
              <div className="relative aspect-[16/10] overflow-hidden border-b border-line bg-white">
                {variant.thumbnailUrl ? (
                  <Image
                    src={variant.thumbnailUrl}
                    alt={`Thumbnail ${variant.variantLabel ?? variant.name}`}
                    fill
                    sizes="(max-width: 768px) 100vw, 380px"
                    className="object-cover"
                  />
                ) : (
                  <div
                    className={`h-full w-full bg-gradient-to-br ${themeGradient(theme.style)}`}
                  />
                )}
              </div>
              <div className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <h2 className="text-[15px] font-semibold text-ink">
                    {variant.variantLabel ?? variant.name}
                  </h2>
                  <Badge>{layoutLabel(variant.layout)}</Badge>
                </div>
                <p className="mt-1 line-clamp-1 text-xs text-muted">
                  {industryLabels(variant.industries) || "Umum"}
                </p>
              </div>
            </Link>
          );
        })}
        {!variants.length ? (
          <p className="text-sm text-muted">Belum ada varian pada tier ini.</p>
        ) : null}
      </div>
    </div>
  );
}
