import { describe, expect, it } from "vitest";
import { renderComposition } from "@/shared/lib/composition-render";

const IDS = [
  "split-editorial-basic-v1",
  "advisory-basic",
  "bloom-pro",
  "studio-pro",
  "story-pro",
  "boardroom-pro",
  "launch-pro",
  "petal-pro",
];

describe("all Landing compositions", () => {
  for (const id of IDS) {
    it(`renders ${id}`, async () => {
      const { html } = await renderComposition(id);
      expect(html).toContain("<!doctype html>");
      expect(html).toContain('data-slot="S-HERO"');
      expect(html).toContain('data-slot="S-FOOT"');
      expect(html).not.toContain("{{");
      expect(html).not.toContain("knowledge");
    });
  }
});
