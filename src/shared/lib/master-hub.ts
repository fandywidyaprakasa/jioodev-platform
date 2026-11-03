import { mockTemplates } from "./mock-data";
import type { ProductType, Template } from "@/shared/types";

interface MasterFoundation {
  id: string;
  asset_code?: string;
  display_name?: string;
  slug?: string;
  source_name?: string;
  product_type?: ProductType;
  layout_archetype?: string;
  style_primary?: string;
  style_secondary?: string;
  industries?: string[];
  business_purposes?: string[];
  technical_format?: string;
  preview_url?: string;
  thumbnail_url?: string;
  status?: string;
  attributes?: {
    name?: string;
    description?: string;
    thumbnail_url?: string;
    preview_url?: string;
  } | null;
}

const BASE =
  process.env.MASTER_HUB_URL ?? process.env.POCKETBASE_MASTER_URL;
const TOKEN =
  process.env.MASTER_HUB_TOKEN ?? process.env.POCKETBASE_SERVICE_TOKEN;

export function masterHubConfigured() {
  return Boolean(BASE);
}

function toTemplate(item: MasterFoundation): Template {
  const code = item.asset_code ?? item.id;
  return {
    code,
    name:
      item.display_name ??
      item.attributes?.name ??
      item.source_name ??
      code,
    productType: item.product_type ?? "LAND",
    layout: item.layout_archetype ?? "L-SPLIT",
    style: item.style_primary ?? "EDT",
    industries: item.industries ?? [],
    purposes: item.business_purposes ?? [],
    description:
      item.attributes?.description ??
      `${item.layout_archetype ?? "Layout"} · ${item.style_primary ?? "Style"}${item.style_secondary ? ` / ${item.style_secondary}` : ""}`,
    previewUrl: item.preview_url ?? item.attributes?.preview_url,
    thumbnailUrl: item.thumbnail_url ?? item.attributes?.thumbnail_url,
  };
}

export async function listMasterTemplates(): Promise<Template[]> {
  if (!BASE) return [];
  try {
    const filter = encodeURIComponent(
      "status='READY' && technical_format='F-HTM'",
    );
    const response = await fetch(
      `${BASE}/api/collections/design_foundations/records?filter=(${filter})&perPage=200&sort=-created`,
      {
        headers: TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {},
        cache: "no-store",
      },
    );
    if (!response.ok) return [];
    const body = (await response.json()) as { items?: MasterFoundation[] };
    return (body.items ?? []).map(toTemplate);
  } catch {
    return [];
  }
}

export async function getMasterTemplate(
  code: string,
): Promise<Template | null> {
  if (!BASE) return null;
  try {
    const filter = encodeURIComponent(
      `asset_code='${code.replace(/'/g, "")}' && status='READY'`,
    );
    const response = await fetch(
      `${BASE}/api/collections/design_foundations/records?filter=(${filter})&perPage=1`,
      {
        headers: TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {},
        cache: "no-store",
      },
    );
    if (!response.ok) return null;
    const body = (await response.json()) as { items?: MasterFoundation[] };
    const item = body.items?.[0];
    return item ? toTemplate(item) : null;
  } catch {
    return null;
  }
}

export async function listCatalogTemplates(): Promise<Template[]> {
  const remote = await listMasterTemplates();
  return remote.length ? remote : mockTemplates;
}

export interface MasterSection {
  code: string;
  name: string;
  purposes: string[];
}

export interface MasterCopy {
  id: string;
  content: string;
  kind: string;
  tone: string;
}

async function fetchCollection<T>(
  collection: string,
  query: string,
): Promise<T[]> {
  if (!BASE) return [];
  try {
    const response = await fetch(
      `${BASE}/api/collections/${collection}/records?${query}`,
      {
        headers: TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {},
        cache: "no-store",
      },
    );
    if (!response.ok) return [];
    const body = (await response.json()) as { items?: T[] };
    return body.items ?? [];
  } catch {
    return [];
  }
}

export async function listMasterSections(): Promise<MasterSection[]> {
  const items = await fetchCollection<{
    section_code?: string;
    name?: string;
    purpose?: string[];
  }>("section_library", "filter=status='READY'&perPage=200&sort=name");
  return items.map((item) => ({
    code: item.section_code ?? "",
    name: item.name ?? item.section_code ?? "Section",
    purposes: item.purpose ?? [],
  }));
}

export async function listMasterCopy(): Promise<MasterCopy[]> {
  const items = await fetchCollection<{
    id: string;
    copy_id?: string;
    content?: string;
    kind?: string;
    tone?: string;
  }>(
    "copywriting_library",
    "filter=status='READY'&perPage=50&sort=-created",
  );
  return items.map((item) => ({
    id: item.id,
    content: item.content ?? "",
    kind: item.kind ?? "",
    tone: item.tone ?? "",
  }));
}
