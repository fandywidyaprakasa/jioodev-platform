import { describe, it, expect, vi, beforeEach } from "vitest";
import { workspaceSlotMeta } from "@/modules/workspace/application/workspace";
import { loadWorkspace } from "@/modules/workspace/application/workspace";

vi.mock("node:fs", () => ({
  promises: {
    readFile: vi.fn(),
    readdir: vi.fn(),
    stat: vi.fn(),
  },
}));

vi.mock("node:path", () => ({
  default: { join: vi.fn((...args: string[]) => args.join("/")) },
  join: vi.fn((...args: string[]) => args.join("/")),
}));

const getMocks = async () => {
  const fs = await import("node:fs");
  return vi.mocked(fs.promises);
};

describe("workspaceSlotMeta", () => {
  it("returns fallback when raw is null", () => {
    const result = workspaceSlotMeta("S-HERO", null);
    expect(result).toEqual({ code: "S-HERO", name: "S-HERO", required: false });
  });

  it("returns fallback when raw is not an object", () => {
    const result = workspaceSlotMeta("S-HERO", "invalid");
    expect(result).toEqual({ code: "S-HERO", name: "S-HERO", required: false });
  });

  it("extracts name, required, orderMin, orderMax from valid raw", () => {
    const raw = {
      code: "S-HERO",
      name: "Hero",
      required: true,
      order_min: 1,
      order_max: 1,
    };
    const result = workspaceSlotMeta("S-HERO", raw);
    expect(result).toEqual({
      code: "S-HERO",
      name: "Hero",
      required: true,
      orderMin: 1,
      orderMax: 1,
    });
  });

  it("handles camelCase orderMin/orderMax", () => {
    const raw = {
      code: "S-HERO",
      name: "Hero",
      required: true,
      orderMin: 1,
      orderMax: 1,
    };
    const result = workspaceSlotMeta("S-HERO", raw);
    expect(result).toEqual({
      code: "S-HERO",
      name: "Hero",
      required: true,
      orderMin: 1,
      orderMax: 1,
    });
  });

  it("falls back to slot code when name is missing or empty", () => {
    const result = workspaceSlotMeta("S-HERO", { name: "", required: true });
    expect(result.name).toBe("S-HERO");
  });

  it("defaults required to false when missing", () => {
    const result = workspaceSlotMeta("S-HERO", { name: "Hero" });
    expect(result.required).toBe(false);
  });
});

describe("loadWorkspace slot metadata", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("loads slot metadata for composition blocks", async () => {
    const mockFs = await getMocks();

    const compositionJson = {
      composition_id: "split-editorial-basic-v1",
      display_name: "Split",
      slug: "split-basic",
      theme_id: "split-edt",
      tier: "BASIC",
      blocks: [
        { slot: "S-HERO", variant: "hero-split", enabled: true, order: 1 },
        { slot: "S-BEN", variant: "ben-grid-3", enabled: true, order: 2 },
        { slot: "S-TEST", variant: "test-cards", enabled: true, order: 3 },
        { slot: "S-CTA", variant: "cta-band", enabled: true, order: 4 },
        { slot: "S-FOOT", variant: "foot-full", enabled: true, order: 10 },
      ],
      status: "READY",
    };

    const contentJson = {};

    const heroSlotJson = {
      code: "S-HERO",
      name: "Hero",
      required: true,
      order_min: 1,
      order_max: 1,
    };

    const footSlotJson = {
      code: "S-FOOT",
      name: "Footer",
      required: true,
      order_min: 10,
      order_max: 10,
    };

    mockFs.readFile.mockImplementation(async (filePath: any) => {
      const pathStr = String(filePath);
      if (pathStr.endsWith("composition.json")) return JSON.stringify(compositionJson);
      if (pathStr.endsWith("content.json")) return JSON.stringify(contentJson);
      if (pathStr.includes("S-HERO/slot.json")) return JSON.stringify(heroSlotJson);
      if (pathStr.includes("S-FOOT/slot.json")) return JSON.stringify(footSlotJson);
      if (pathStr.includes("slot.json")) throw new Error("ENOENT");
      if (pathStr.includes("variant.json")) return JSON.stringify({ code: "v1", name: "V1", slot_code: "S-HERO", status: "READY", compatible_themes: ["split-edt"] });
      if (pathStr.includes("theme.json")) return JSON.stringify({ theme_id: "split-edt", name: "Split", status: "READY" });
      throw new Error("ENOENT");
    });

    mockFs.readdir.mockImplementation(((async (dirPath: any): Promise<string[]> => {
      const pathStr = String(dirPath);
      if (pathStr.endsWith("sections")) return ["S-HERO", "S-BEN", "S-TEST", "S-CTA", "S-FOOT", "_hidden"];
      if (pathStr.includes("sections/S-HERO")) return ["hero-split"];
      if (pathStr.includes("sections/S-BEN")) return ["ben-grid-3"];
      if (pathStr.includes("sections/S-TEST")) return ["test-cards"];
      if (pathStr.includes("sections/S-CTA")) return ["cta-band"];
      if (pathStr.includes("sections/S-FOOT")) return ["foot-full"];
      if (pathStr.endsWith("themes")) return ["split-edt"];
      return [];
    }) as any));

    mockFs.stat.mockResolvedValue({ isDirectory: () => true } as any);

    const result = await loadWorkspace("split-editorial-basic-v1");

    expect(result).not.toBeNull();
    expect(result!.slots).toBeDefined();
    expect(result!.slots["S-HERO"]).toEqual({ code: "S-HERO", name: "Hero", required: true, orderMin: 1, orderMax: 1 });
    expect(result!.slots["S-FOOT"]).toEqual({ code: "S-FOOT", name: "Footer", required: true, orderMin: 10, orderMax: 10 });
    expect(result!.slots["S-BEN"]).toEqual({ code: "S-BEN", name: "S-BEN", required: false });
    expect(result!.slots["S-TEST"]).toEqual({ code: "S-TEST", name: "S-TEST", required: false });
    expect(result!.slots["S-CTA"]).toEqual({ code: "S-CTA", name: "S-CTA", required: false });
  });

  it("handles missing slot.json gracefully with fallback", async () => {
    const mockFs = await getMocks();

    const compositionJson = {
      composition_id: "test-composition",
      display_name: "Test",
      slug: "test",
      theme_id: "theme1",
      tier: "BASIC",
      blocks: [{ slot: "S-MISSING", variant: "v1", enabled: true, order: 1 }],
      status: "READY",
    };

    mockFs.readFile.mockImplementation(async (filePath: any) => {
      const pathStr = String(filePath);
      if (pathStr.endsWith("composition.json")) return JSON.stringify(compositionJson);
      if (pathStr.endsWith("content.json")) return JSON.stringify({});
      if (pathStr.includes("variant.json")) return JSON.stringify({ code: "v1", name: "V1", slot_code: "S-MISSING", status: "READY", compatible_themes: ["theme1"] });
      if (pathStr.includes("theme.json")) return JSON.stringify({ theme_id: "theme1", name: "Theme", status: "READY" });
      throw new Error("ENOENT");
    });

    mockFs.readdir.mockImplementation(((async (dirPath: any): Promise<string[]> => {
      const pathStr = String(dirPath);
      if (pathStr.endsWith("sections")) return ["S-MISSING"];
      if (pathStr.includes("sections/S-MISSING")) return ["v1"];
      if (pathStr.endsWith("themes")) return ["theme1"];
      return [];
    }) as any));

    mockFs.stat.mockResolvedValue({ isDirectory: () => true } as any);

    const result = await loadWorkspace("test-composition");

    expect(result).not.toBeNull();
    expect(result!.slots["S-MISSING"]).toEqual({ code: "S-MISSING", name: "S-MISSING", required: false });
  });
});