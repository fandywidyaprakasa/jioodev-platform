import { promises as fs } from "node:fs";
import path from "node:path";
import { getMasterTemplate, listCatalogTemplates } from "../infrastructure/master-hub";
import { mockTemplates } from "@/shared/lib/mock-data";
import { MVP_PRODUCT_TYPES, type ProductType, type Template } from "@/shared/types";

const NAMES: Record<string, string> = {
  "COMM-LCONV-EDT-018": "Konversi Commerce",
  "COMM-LGRID-EDT-015": "Grid Katalog",
  "COMM-LMENU-EDT-016": "Menu Commerce",
  "COMM-LMENU-EDT-017": "Menu Commerce Warm",
  "WEB-LBOOK-EDT-014": "Booking Website",
  "WEB-LMENU-EDT-009": "Menu Website",
  "WEB-LMENU-EDT-010": "Menu Website Dua",
  "WEB-LMENU-EDT-011": "Menu Website Tiga",
  "WEB-LPORT-EDT-012": "Portofolio Website",
  "WEB-LPORT-EDT-013": "Portofolio Website Dua",
};

const LAYOUTS: Record<string, string> = {
  "L-MENU": "menu",
  "L-SPLIT": "split hero",
  "L-SVC": "layanan",
  "L-PORT": "portofolio",
  "L-CONV": "konversi",
  "L-STORY": "story",
  "L-PRICE": "price list",
  "L-BOOK": "booking",
  "L-GRID": "grid katalog",
};

interface SnapshotMeta {
  status?: "READY" | "STALE" | "FAILED";
  render_hash?: string;
}

async function readSnapshotMeta(dir: string): Promise<SnapshotMeta | null> {
  try {
    return JSON.parse(
      await fs.readFile(path.join(dir, "previews", "snapshot.json"), "utf8"),
    ) as SnapshotMeta;
  } catch {
    return null;
  }
}

interface Meta {
  asset_code?: string;
  display_name?: string;
  slug?: string;
  status?: string;
  product_type?: ProductType;
  layout_archetype?: string;
  style_primary?: string;
  style_secondary?: string;
  industries?: string[];
  business_purposes?: string[];
  theme_id?: string;
  tier?: Template["tier"];
  variant_label?: string;
}

async function thumbnailFor(code: string): Promise<string | undefined> {
  try {
    await fs.access(
      path.join(process.cwd(), "public", "template-thumbnails", `${code}.jpg`),
    );
    return `/template-thumbnails/${code}.jpg`;
  } catch {
    return undefined;
  }
}

export async function listLocalTemplates(
  productTypes: ProductType[] = MVP_PRODUCT_TYPES,
): Promise<Template[]> {
  const root =
    process.env.JIOODEV_LIBRARY_DIR ??
    path.join(process.cwd(), "..", "library");
  const dir = path.join(root, "templates");
  let entries: string[] = [];
  try {
    entries = await fs.readdir(dir);
  } catch {
    return [];
  }

  const templates: Template[] = [];
  for (const code of entries) {
    if (code.startsWith("_") || code.startsWith(".")) continue;
    try {
      const [metaRaw] = await Promise.all([
        fs.readFile(path.join(dir, code, "meta.json"), "utf8"),
        fs.access(path.join(dir, code, "index.html")),
      ]);
      const meta = JSON.parse(metaRaw) as Meta;
      if (meta.status !== "READY") continue;
      const snapshot = await readSnapshotMeta(path.join(dir, code));
      const productType = meta.product_type ?? "LAND";
      if (!productTypes.includes(productType)) continue;
      const layout = meta.layout_archetype ?? "L-SPLIT";
      const assetCode = meta.asset_code ?? code;
      const thumbnailUrl = await thumbnailFor(assetCode);
      templates.push({
        code: assetCode,
        name:
          meta.variant_label ??
          meta.display_name ??
          NAMES[meta.asset_code ?? code] ??
          `${layout} template`,
        productType,
        layout,
        style: meta.style_primary ?? "EDT",
        industries: meta.industries ?? [],
        purposes: meta.business_purposes ?? [],
        description: `Template ${meta.product_type ?? "LAND"} dengan struktur ${
          LAYOUTS[layout] ?? layout
        } dan pendekatan editorial.`,
        previewUrl: `/template-preview/${assetCode}`,
        thumbnailUrl,
        ...(snapshot?.render_hash
          ? { previewHash: snapshot.render_hash }
          : {}),
        previewStatus:
          snapshot?.status === "READY"
            ? "READY"
            : snapshot?.status === "STALE"
              ? "STALE"
              : snapshot?.status === "FAILED"
                ? "FAILED"
                : "MISSING",
        themeId: meta.theme_id,
        tier: meta.tier,
        variantLabel: meta.variant_label,
      });
    } catch {
      // Skip folders without a complete template.
    }
  }

  return templates.sort((a, b) =>
    `${a.productType}-${a.code}`.localeCompare(`${b.productType}-${b.code}`),
  );
}

export async function listTemplates(
  productTypes: ProductType[] = MVP_PRODUCT_TYPES,
): Promise<Template[]> {
  const local = await listLocalTemplates(productTypes);
  if (local.length) return local;
  const master = await listCatalogTemplates().catch(() => []);
  return (master.length ? master : mockTemplates).filter((item) =>
    productTypes.includes(item.productType),
  );
}

export async function getTemplate(
  code: string,
  productTypes: ProductType[] = MVP_PRODUCT_TYPES,
): Promise<Template | null> {
  const local = await listLocalTemplates(productTypes);
  const match = local.find((item) => item.code === code);
  if (match) return match;
  const remote = await getMasterTemplate(code);
  if (remote && productTypes.includes(remote.productType)) return remote;
  return mockTemplates.find(
    (item) => item.code === code && productTypes.includes(item.productType),
  ) ?? null;
}
