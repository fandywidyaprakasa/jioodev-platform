import { promises as fs } from "node:fs";
import path from "node:path";

export interface WorkspaceBlock {
  slot: string;
  variant: string;
  enabled: boolean;
  order: number;
}

export interface WorkspaceComposition {
  composition_id: string;
  display_name: string;
  slug: string;
  theme_id: string;
  tier: "BASIC" | "PRO" | "AGENCY";
  blocks: WorkspaceBlock[];
  status: string;
}

export interface WorkspaceVariant {
  code: string;
  name: string;
  status: string;
}

export interface WorkspaceTheme {
  theme_id: string;
  name: string;
  status: string;
}

export interface WorkspaceSlotMeta {
  code: string;
  name: string;
  required: boolean;
  orderMin?: number;
  orderMax?: number;
}

export interface WorkspaceData {
  composition: WorkspaceComposition;
  content: Record<string, unknown>;
  variants: Record<string, WorkspaceVariant[]>;
  themes: WorkspaceTheme[];
  slots: Record<string, WorkspaceSlotMeta>;
}

function libraryRoot() {
  return (
    process.env.JIOODEV_LIBRARY_DIR ??
    path.join(process.cwd(), "..", "library")
  );
}

function safeId(value: string) {
  return /^[A-Za-z0-9-]+$/.test(value) ? value : null;
}

async function readJson<T>(file: string): Promise<T> {
  return JSON.parse(await fs.readFile(file, "utf8")) as T;
}

export function workspaceSlotMeta(slot: string, raw: unknown): WorkspaceSlotMeta {
  const obj = raw as
    | (Partial<WorkspaceSlotMeta> & { order_min?: number; order_max?: number })
    | null;
  if (!obj || typeof obj !== "object") {
    return { code: slot, name: slot, required: false };
  }
  const name = typeof obj.name === "string" && obj.name.length > 0 ? obj.name : slot;
  const required = typeof obj.required === "boolean" ? obj.required : false;
  const orderMin =
    typeof obj.orderMin === "number"
      ? obj.orderMin
      : typeof obj.order_min === "number"
        ? obj.order_min
        : undefined;
  const orderMax =
    typeof obj.orderMax === "number"
      ? obj.orderMax
      : typeof obj.order_max === "number"
        ? obj.order_max
        : undefined;
  return { code: slot, name, required, orderMin, orderMax };
}

export async function loadWorkspace(id: string): Promise<WorkspaceData | null> {
  if (!safeId(id)) return null;
  const root = libraryRoot();
  const dir = path.join(root, "compositions", id);
  try {
    const composition = await readJson<WorkspaceComposition>(
      path.join(dir, "composition.json"),
    );
    const content = await readJson<Record<string, unknown>>(
      path.join(dir, "content.json"),
    );

    const variants: Record<string, WorkspaceVariant[]> = {};
    const sectionsRoot = path.join(root, "sections");
    for (const slot of await fs.readdir(sectionsRoot)) {
      const slotDir = path.join(sectionsRoot, slot);
      const stat = await fs.stat(slotDir).catch(() => null);
      if (!stat?.isDirectory() || slot.startsWith("_")) continue;
      for (const variantDir of await fs.readdir(slotDir)) {
        const variantFile = path.join(slotDir, variantDir, "variant.json");
        try {
          const variant = await readJson<{
            code: string;
            name: string;
            slot_code: string;
            status: string;
            compatible_themes?: string[];
          }>(variantFile);
          if (
            variant.status === "READY" &&
            variant.slot_code === slot &&
            variant.compatible_themes?.includes(composition.theme_id)
          ) {
            (variants[slot] ??= []).push({
              code: variant.code,
              name: variant.name,
              status: variant.status,
            });
          }
        } catch {
          continue;
        }
      }
      variants[slot]?.sort((a, b) => a.name.localeCompare(b.name));
    }

    const themes: WorkspaceTheme[] = [];
    for (const themeDir of await fs.readdir(path.join(root, "themes"))) {
      const themeFile = path.join(root, "themes", themeDir, "theme.json");
      try {
        const theme = await readJson<{ theme_id: string; name: string; status: string }>(
          themeFile,
        );
        if (theme.status === "READY") {
          themes.push({ theme_id: theme.theme_id, name: theme.name, status: theme.status });
        }
      } catch {
        continue;
      }
    }

    const slots: Record<string, WorkspaceSlotMeta> = {};
    for (const block of composition.blocks) {
      if (slots[block.slot]) continue;
      const slotFile = path.join(root, "sections", block.slot, "slot.json");
      try {
        const raw = await readJson<unknown>(slotFile);
        slots[block.slot] = workspaceSlotMeta(block.slot, raw);
      } catch {
        slots[block.slot] = workspaceSlotMeta(block.slot, null);
      }
    }

    return { composition, content, variants, themes, slots };
  } catch {
    return null;
  }
}

export async function findSlotContent(slot: string): Promise<unknown> {
  const root = libraryRoot();
  const compRoot = path.join(root, "compositions");
  for (const entry of await fs.readdir(compRoot, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    try {
      const content = await readJson<Record<string, unknown>>(
        path.join(compRoot, entry.name, "content.json"),
      );
      if (content[slot]) return content[slot];
    } catch {
      continue;
    }
  }
  return {};
}
