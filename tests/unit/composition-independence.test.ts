import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { renderComposition } from "@/modules/workspace";

const previous = process.env.JIOODEV_LIBRARY_DIR;

describe("composition independence", () => {
  beforeAll(() => {
    process.env.JIOODEV_LIBRARY_DIR = path.join(
      process.cwd(),
      "tests",
      "fixtures",
      "library",
    );
  });

  afterAll(() => {
    if (previous === undefined) delete process.env.JIOODEV_LIBRARY_DIR;
    else process.env.JIOODEV_LIBRARY_DIR = previous;
  });

  it("uses the default theme", async () => {
    const { html } = await renderComposition("test-basic");
    expect(html).toContain("--color-accent:#111111");
  });

  it("swaps theme without changing the variant", async () => {
    const { html } = await renderComposition("test-basic", { themeId: "alt" });
    expect(html).toContain("--color-accent:#222222");
    expect(html).toContain('data-variant="hero-split"');
  });

  it("swaps variant without changing the theme", async () => {
    const { html } = await renderComposition("test-basic", {
      blocks: [{ slot: "S-HERO", variant: "hero-alt", enabled: true, order: 1 }],
    });
    expect(html).toContain('data-variant="hero-alt"');
    expect(html).toContain("--color-accent:#111111");
  });

  it("rejects variant outside the tier", async () => {
    await expect(
      renderComposition("test-basic", {
        tier: "PRO",
        blocks: [{ slot: "S-HERO", variant: "hero-alt", enabled: true, order: 1 }],
      }),
    ).rejects.toThrow("tidak kompatibel dengan tier PRO");
  });
});
