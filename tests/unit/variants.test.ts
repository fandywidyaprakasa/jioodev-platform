import { promises as fs } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { renderVariantPreview } from "@/modules/workspace";

const SECTION_ROOT = path.join(process.cwd(), "..", "library", "sections");

async function variantList() {
  const slots = await fs.readdir(SECTION_ROOT, { withFileTypes: true });
  const pairs: Array<{ slot: string; variant: string }> = [];
  for (const slot of slots) {
    if (!slot.isDirectory() || slot.name.startsWith("_")) continue;
    for (const variant of await fs.readdir(path.join(SECTION_ROOT, slot.name))) {
      if (variant.startsWith("_")) continue;
      const file = path.join(SECTION_ROOT, slot.name, variant, "variant.json");
      try {
        await fs.access(file);
        pairs.push({ slot: slot.name, variant });
      } catch {
        continue;
      }
    }
  }
  return pairs;
}

describe("all variants", () => {
  it("renders 45 variants without unresolved placeholders", async () => {
    const pairs = await variantList();
    expect(pairs).toHaveLength(45);
    for (const pair of pairs) {
      const html = await renderVariantPreview(pair.slot, pair.variant, {});
      expect(html, `${pair.slot}/${pair.variant}`).not.toContain("{{");
      expect(html).toContain(`data-variant="${pair.variant}"`);
    }
  });
});
