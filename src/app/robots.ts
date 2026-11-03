import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const base = process.env.SITE_URL ?? "https://jioo.site";
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: ["/app", "/admin", "/api", "/preview"] },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
