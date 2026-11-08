import { describe, expect, it } from "vitest";
import { loadWorkspace } from "@/modules/workspace";
import { renderSiteSnapshot } from "@/modules/projects";

describe("project site render consistency", () => {
  it("renders the same project snapshot deterministically for preview and publish", async () => {
    const base = await loadWorkspace("split-editorial-basic-v1");
    expect(base).not.toBeNull();
    if (!base) return;

    const snapshot = {
      compositionId: base.composition.composition_id,
      themeId: base.composition.theme_id,
      tier: base.composition.tier,
      blocks: base.composition.blocks,
      content: {
        ...base.content,
        "S-HERO": {
          ...(base.content["S-HERO"] as Record<string, unknown>),
          headline: "Headline konsisten",
        },
      },
    };

    const first = await renderSiteSnapshot(snapshot);
    const second = await renderSiteSnapshot(snapshot);

    expect(first.html).toBe(second.html);
    expect(first.html).toContain("Headline konsisten");
    expect(first.html).toContain('data-slot="S-HERO"');
  });
});
