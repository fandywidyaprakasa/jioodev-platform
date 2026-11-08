import { describe, expect, it } from "vitest";
import { renderComposition } from "@/modules/workspace";

describe("composition renderer", () => {
  it("renders the Split Basic composition", async () => {
    const { html } = await renderComposition("split-editorial-basic-v1");
    expect(html).toContain('data-slot="S-HERO"');
    expect(html).toContain('data-slot="S-BEN"');
    expect(html).toContain('data-slot="S-TEST"');
    expect(html).toContain('data-slot="S-CTA"');
    expect(html).toContain('data-slot="S-FOOT"');
    expect(html).toContain("Bangun kehadiran digital yang benar-benar bekerja.");
    expect(html).toMatch(/--color-accent:\s*#a34a30/i);
    expect(html).not.toContain("{{");
  });

  it("keeps slot order from composition", async () => {
    const { html } = await renderComposition("split-editorial-basic-v1");
    const order = ["S-HERO", "S-BEN", "S-TEST", "S-CTA", "S-FOOT"].map((slot) =>
      html.indexOf(`data-slot="${slot}"`),
    );
    expect(order.every((value) => value >= 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
  });

  it("injects content without changing structure", async () => {
    const { html } = await renderComposition("split-editorial-basic-v1", {
      content: {
        "S-HERO": {
          eyebrow: "Konteks baru",
          headline: "Judul dari konten project",
          subheadline: "Subjudul dari konten project.",
          primary_cta: { label: "Mulai", href: "#kontak" },
          secondary_cta: { label: "Lihat", href: "#layanan" },
          media: { src: "/contoh.jpg", alt: "Contoh" },
        },
      },
    });
    expect(html).toContain("Judul dari konten project");
    expect(html).not.toContain("Bangun kehadiran digital yang benar-benar bekerja.");
    expect(html).toContain('data-slot="S-HERO"');
  });

  it("skips disabled blocks", async () => {
    const { html } = await renderComposition("split-editorial-basic-v1", {
      blocks: [
        { slot: "S-HERO", variant: "hero-split", enabled: true, order: 1 },
        { slot: "S-BEN", variant: "ben-grid-3", enabled: false, order: 2 },
        { slot: "S-FOOT", variant: "foot-full", enabled: true, order: 10 },
      ],
    });
    expect(html).toContain('data-slot="S-HERO"');
    expect(html).not.toContain('data-slot="S-BEN"');
    expect(html).toContain('data-slot="S-FOOT"');
  });

  it("rejects unknown composition", async () => {
    await expect(renderComposition("tidak-ada")).rejects.toThrow();
  });
});
