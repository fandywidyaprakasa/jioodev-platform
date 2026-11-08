import type { MetadataRoute } from "next";
import { listPublishedPages, publicBaseUrl } from "@/modules/publishing";
import { listThemes } from "@/modules/catalog";
import { ALL_PRODUCT_TYPES } from "@/shared/types";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base =
    process.env.SITE_URL ?? publicBaseUrl() ?? "https://jioo.site";
  const routes = ["", "/features", "/pricing", "/templates", "/contact", "/login", "/register"];
  const now = new Date();
  const pages = await listPublishedPages().catch(() => []);
  const themes = await listThemes(ALL_PRODUCT_TYPES).catch(() => []);
  return [
    ...routes.map((route) => ({
      url: `${base}${route}`,
      lastModified: now,
      changeFrequency: (route === "" ? "weekly" : "monthly") as
        | "weekly"
        | "monthly",
      priority: route === "" ? 1 : 0.6,
    })),
    ...themes.map((theme) => ({
      url: `${base}/templates/theme/${theme.themeId}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
    ...pages.map((page) => ({
      url: `${base}/p/${page.slug}`,
      lastModified: page.published_at ? new Date(page.published_at) : now,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
  ];
}
