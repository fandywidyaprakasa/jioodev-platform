import { promises as fs } from "node:fs";
import path from "node:path";
import { listLocalTemplates } from "./templates-server";
import type {
  ProductType,
  Template,
  Theme,
  ThemeProductGroup,
  ThemeStatus,
  ThemeTier,
} from "@/shared/types";

interface ThemeMeta {
  theme_id?: string;
  name?: string;
  description?: string;
  style?: string;
  thumbnail?: string;
  status?: ThemeStatus;
}

const TIER_ORDER: Record<ThemeTier, number> = {
  BASIC: 0,
  PRO: 1,
  AGENCY: 2,
};

function libraryRoot() {
  return (
    process.env.JIOODEV_LIBRARY_DIR ??
    path.join(process.cwd(), "..", "library")
  );
}

async function readThemeMeta(themeId: string): Promise<ThemeMeta | null> {
  if (!/^[a-z0-9-]+$/.test(themeId)) return null;
  try {
    const raw = await fs.readFile(
      path.join(libraryRoot(), "themes", themeId, "theme.json"),
      "utf8",
    );
    return JSON.parse(raw) as ThemeMeta;
  } catch {
    return null;
  }
}

function groupVariants(variants: Template[]): ThemeProductGroup[] {
  const products = new Map<ProductType, Map<ThemeTier, Template[]>>();
  for (const variant of variants) {
    const type = variant.productType;
    const tier = variant.tier ?? "BASIC";
    const tiers = products.get(type) ?? new Map<ThemeTier, Template[]>();
    tiers.set(tier, [...(tiers.get(tier) ?? []), variant]);
    products.set(type, tiers);
  }
  return [...products.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([type, tiers]) => ({
      type,
      tiers: [...tiers.entries()]
        .sort(([a], [b]) => TIER_ORDER[a] - TIER_ORDER[b])
        .map(([tier, items]) => ({
          tier,
          variants: items.sort((a, b) =>
            (a.variantLabel ?? a.name).localeCompare(b.variantLabel ?? b.name),
          ),
        })),
    }));
}

async function toTheme(themeId: string, variants: Template[]): Promise<Theme | null> {
  const meta = await readThemeMeta(themeId);
  if (!meta || meta.status !== "READY") return null;
  const products = groupVariants(variants);
  if (!products.length) return null;
  return {
    themeId,
    name: meta.name ?? themeId,
    description: meta.description ?? "",
    style: meta.style ?? variants[0]?.style ?? "EDT",
    thumbnailUrl: meta.thumbnail
      ? `/theme-assets/${themeId}/${meta.thumbnail}`
      : undefined,
    status: meta.status,
    products,
    variantCount: variants.length,
  };
}

export async function listThemes(): Promise<Theme[]> {
  const templates = await listLocalTemplates();
  const byTheme = new Map<string, Template[]>();
  for (const template of templates) {
    if (!template.themeId) continue;
    byTheme.set(template.themeId, [
      ...(byTheme.get(template.themeId) ?? []),
      template,
    ]);
  }
  const themes = await Promise.all(
    [...byTheme.entries()].map(([id, variants]) => toTheme(id, variants)),
  );
  return themes
    .filter((theme): theme is Theme => Boolean(theme))
    .sort(
      (a, b) =>
        b.variantCount - a.variantCount || a.name.localeCompare(b.name),
    );
}

export async function getTheme(themeId: string): Promise<Theme | null> {
  const templates = await listLocalTemplates();
  const variants = templates.filter((template) => template.themeId === themeId);
  if (!variants.length) return null;
  return toTheme(themeId, variants);
}

export function themesForProduct(themes: Theme[], productType: ProductType) {
  return themes
    .map((theme) => {
      const products = theme.products.filter(
        (product) => product.type === productType,
      );
      const variantCount = products.reduce(
        (total, product) =>
          total +
          product.tiers.reduce((sum, tier) => sum + tier.variants.length, 0),
        0,
      );
      return { ...theme, products, variantCount };
    })
    .filter((theme) => theme.products.length);
}

export function themeScore(
  theme: Theme,
  industry: string | undefined,
  purposes: string[],
) {
  const variants = theme.products.flatMap((product) =>
    product.tiers.flatMap((tier) => tier.variants),
  );
  return variants.reduce((score, variant) => {
    const industryMatch =
      industry && variant.industries.includes(industry) ? 2 : 0;
    const purposeMatch = purposes.filter((purpose) =>
      variant.purposes.includes(purpose),
    ).length;
    return Math.max(score, industryMatch + purposeMatch);
  }, 0);
}
