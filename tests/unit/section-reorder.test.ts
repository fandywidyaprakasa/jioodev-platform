import { describe, it, expect } from "vitest";
import { reorderBlocks, type ReorderBlock } from "@/modules/workspace/components/section-reorder";

interface TestBlock extends ReorderBlock {
  id: string;
  name: string;
}

function createBlocks(blocks: { slot: string; order: number; id: string; name: string }[]): TestBlock[] {
  return blocks.map((b) => ({ ...b }));
}

const defaultBounds: Record<string, { orderMin?: number; orderMax?: number }> = {};

describe("section-reorder", () => {
  describe("reorderBlocks", () => {
    it("valid swap: moves block from index 1 to index 2 and normalizes orders", () => {
      const blocks = createBlocks([
        { slot: "header", order: 1, id: "1", name: "Header" },
        { slot: "hero", order: 2, id: "2", name: "Hero" },
        { slot: "features", order: 3, id: "3", name: "Features" },
        { slot: "footer", order: 10, id: "4", name: "Footer" },
      ]);

      const result = reorderBlocks(blocks, "hero", "features", defaultBounds);

      expect(result).not.toBeNull();
      expect(result!.map((b) => b.slot)).toEqual(["header", "features", "hero", "footer"]);
      expect(result!.map((b) => b.order)).toEqual([1, 2, 3, 10]);
    });

    it("valid swap: moves block from index 2 to index 1 and normalizes orders", () => {
      const blocks = createBlocks([
        { slot: "header", order: 1, id: "1", name: "Header" },
        { slot: "hero", order: 2, id: "2", name: "Hero" },
        { slot: "features", order: 3, id: "3", name: "Features" },
        { slot: "footer", order: 10, id: "4", name: "Footer" },
      ]);

      const result = reorderBlocks(blocks, "features", "hero", defaultBounds);

      expect(result).not.toBeNull();
      expect(result!.map((b) => b.slot)).toEqual(["header", "features", "hero", "footer"]);
      expect(result!.map((b) => b.order)).toEqual([1, 2, 3, 10]);
    });

    it("locked first: moving first block returns null", () => {
      const blocks = createBlocks([
        { slot: "header", order: 1, id: "1", name: "Header" },
        { slot: "hero", order: 2, id: "2", name: "Hero" },
        { slot: "footer", order: 10, id: "3", name: "Footer" },
      ]);

      const result = reorderBlocks(blocks, "header", "hero", defaultBounds);

      expect(result).toBeNull();
    });

    it("locked last: moving last block returns null", () => {
      const blocks = createBlocks([
        { slot: "header", order: 1, id: "1", name: "Header" },
        { slot: "hero", order: 2, id: "2", name: "Hero" },
        { slot: "footer", order: 10, id: "3", name: "Footer" },
      ]);

      const result = reorderBlocks(blocks, "footer", "hero", defaultBounds);

      expect(result).toBeNull();
    });

    it("locked first: targeting first block as destination returns null", () => {
      const blocks = createBlocks([
        { slot: "header", order: 1, id: "1", name: "Header" },
        { slot: "hero", order: 2, id: "2", name: "Hero" },
        { slot: "footer", order: 10, id: "3", name: "Footer" },
      ]);

      const result = reorderBlocks(blocks, "hero", "header", defaultBounds);

      expect(result).toBeNull();
    });

    it("locked last: targeting last block as destination returns null", () => {
      const blocks = createBlocks([
        { slot: "header", order: 1, id: "1", name: "Header" },
        { slot: "hero", order: 2, id: "2", name: "Hero" },
        { slot: "footer", order: 10, id: "3", name: "Footer" },
      ]);

      const result = reorderBlocks(blocks, "hero", "footer", defaultBounds);

      expect(result).toBeNull();
    });

    it("invalid target: non-existent fromSlot returns null", () => {
      const blocks = createBlocks([
        { slot: "header", order: 1, id: "1", name: "Header" },
        { slot: "hero", order: 2, id: "2", name: "Hero" },
        { slot: "footer", order: 10, id: "3", name: "Footer" },
      ]);

      const result = reorderBlocks(blocks, "nonexistent", "hero", defaultBounds);

      expect(result).toBeNull();
    });

    it("invalid target: non-existent toSlot returns null", () => {
      const blocks = createBlocks([
        { slot: "header", order: 1, id: "1", name: "Header" },
        { slot: "hero", order: 2, id: "2", name: "Hero" },
        { slot: "footer", order: 10, id: "3", name: "Footer" },
      ]);

      const result = reorderBlocks(blocks, "hero", "nonexistent", defaultBounds);

      expect(result).toBeNull();
    });

    it("no-op: same fromSlot and toSlot returns null", () => {
      const blocks = createBlocks([
        { slot: "header", order: 1, id: "1", name: "Header" },
        { slot: "hero", order: 2, id: "2", name: "Hero" },
        { slot: "footer", order: 10, id: "3", name: "Footer" },
      ]);

      const result = reorderBlocks(blocks, "hero", "hero", defaultBounds);

      expect(result).toBeNull();
    });

    it("normalizes orders correctly with 5 blocks", () => {
      const blocks = createBlocks([
        { slot: "header", order: 1, id: "1", name: "Header" },
        { slot: "hero", order: 2, id: "2", name: "Hero" },
        { slot: "features", order: 3, id: "3", name: "Features" },
        { slot: "pricing", order: 4, id: "4", name: "Pricing" },
        { slot: "footer", order: 10, id: "5", name: "Footer" },
      ]);

      const result = reorderBlocks(blocks, "features", "pricing", defaultBounds);

      expect(result).not.toBeNull();
      expect(result!.map((b) => b.slot)).toEqual(["header", "hero", "pricing", "features", "footer"]);
      expect(result!.map((b) => b.order)).toEqual([1, 2, 3, 4, 10]);
    });

    it("handles arbitrary initial order values and normalizes to 1..10 pattern", () => {
      const blocks = createBlocks([
        { slot: "header", order: 100, id: "1", name: "Header" },
        { slot: "hero", order: 200, id: "2", name: "Hero" },
        { slot: "features", order: 300, id: "3", name: "Features" },
        { slot: "footer", order: 400, id: "4", name: "Footer" },
      ]);

      const result = reorderBlocks(blocks, "hero", "features", defaultBounds);

      expect(result).not.toBeNull();
      expect(result!.map((b) => b.slot)).toEqual(["header", "features", "hero", "footer"]);
      expect(result!.map((b) => b.order)).toEqual([1, 2, 3, 10]);
    });

    it("does not mutate original blocks array", () => {
      const blocks = createBlocks([
        { slot: "header", order: 1, id: "1", name: "Header" },
        { slot: "hero", order: 2, id: "2", name: "Hero" },
        { slot: "features", order: 3, id: "3", name: "Features" },
        { slot: "footer", order: 10, id: "4", name: "Footer" },
      ]);
      const originalOrder = [...blocks.map((b) => b.order)];

      reorderBlocks(blocks, "hero", "features", defaultBounds);

      expect(blocks.map((b) => b.order)).toEqual(originalOrder);
    });
  });
});