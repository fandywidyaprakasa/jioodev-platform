import { describe, it, expect } from "vitest";
import {
  rectsFromElements,
  findSectionAtPoint,
  overlayStyle,
  type SectionRect,
} from "@/modules/workspace/components/section-overlay-geometry";

function createMockElement(
  slot: string,
  rect: { top: number; left: number; width: number; height: number }
): Element {
  const element = {
    getAttribute: (name: string) => (name === "data-slot" ? slot : null),
    getBoundingClientRect: () => ({
      top: rect.top,
      left: rect.left,
      width: rect.width,
      height: rect.height,
      right: rect.left + rect.width,
      bottom: rect.top + rect.height,
      x: rect.left,
      y: rect.top,
      toJSON: () => ({}),
    } as DOMRect),
  } as unknown as Element;
  return element;
}

describe("section-overlay-geometry", () => {
  describe("rectsFromElements", () => {
    it("returns empty array for empty input", () => {
      const result = rectsFromElements([]);
      expect(result).toEqual([]);
    });

    it("extracts rects from elements with data-slot", () => {
      const elements = [
        createMockElement("header", { top: 0, left: 0, width: 800, height: 100 }),
        createMockElement("hero", { top: 100, left: 0, width: 800, height: 400 }),
        createMockElement("footer", { top: 500, left: 0, width: 800, height: 80 }),
      ];
      const result = rectsFromElements(elements);
      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({
        slot: "header",
        top: 0,
        left: 0,
        width: 800,
        height: 100,
      });
      expect(result[1]).toEqual({
        slot: "hero",
        top: 100,
        left: 0,
        width: 800,
        height: 400,
      });
      expect(result[2]).toEqual({
        slot: "footer",
        top: 500,
        left: 0,
        width: 800,
        height: 80,
      });
    });

    it("skips elements without data-slot", () => {
      const elementWithoutSlot = {
        getAttribute: () => null,
        getBoundingClientRect: () => ({
          top: 200,
          left: 0,
          width: 800,
          height: 100,
          right: 800,
          bottom: 300,
          x: 0,
          y: 200,
          toJSON: () => ({}),
        } as DOMRect),
      } as unknown as Element;
      const elements = [
        createMockElement("header", { top: 0, left: 0, width: 800, height: 100 }),
        elementWithoutSlot,
        createMockElement("footer", { top: 500, left: 0, width: 800, height: 80 }),
      ];
      const result = rectsFromElements(elements);
      expect(result).toHaveLength(2);
      expect(result.map((r) => r.slot)).toEqual(["header", "footer"]);
    });
  });

  describe("findSectionAtPoint", () => {
    const rects: SectionRect[] = [
      { slot: "header", top: 0, left: 0, width: 800, height: 100 },
      { slot: "hero", top: 100, left: 0, width: 800, height: 400 },
      { slot: "footer", top: 500, left: 0, width: 800, height: 80 },
    ];

    it("returns slot when point is inside rect", () => {
      expect(findSectionAtPoint(rects, 100, 50)).toBe("header");
      expect(findSectionAtPoint(rects, 400, 300)).toBe("hero");
      expect(findSectionAtPoint(rects, 200, 540)).toBe("footer");
    });

    it("returns null when point is outside all rects", () => {
      expect(findSectionAtPoint(rects, -10, -10)).toBeNull();
      expect(findSectionAtPoint(rects, 900, 900)).toBeNull();
      expect(findSectionAtPoint(rects, 400, 950)).toBeNull();
    });

    it("returns null for empty rects array", () => {
      expect(findSectionAtPoint([], 100, 100)).toBeNull();
    });

    it("handles edge boundaries correctly", () => {
      expect(findSectionAtPoint(rects, 0, 0)).toBe("header");
      expect(findSectionAtPoint(rects, 799, 99)).toBe("header");
      expect(findSectionAtPoint(rects, 800, 100)).toBeNull();
    });

    it("returns first match when rects overlap", () => {
      const overlappingRects: SectionRect[] = [
        { slot: "outer", top: 0, left: 0, width: 800, height: 600 },
        { slot: "inner", top: 100, left: 100, width: 200, height: 200 },
      ];
      expect(findSectionAtPoint(overlappingRects, 150, 150)).toBe("outer");
    });
  });

  describe("overlayStyle", () => {
    it("returns correct CSS properties", () => {
      const rect: SectionRect = {
        slot: "hero",
        top: 100,
        left: 50,
        width: 700,
        height: 400,
      };
      const style = overlayStyle(rect);
      expect(style).toEqual({
        position: "absolute",
        top: 100,
        left: 50,
        width: 700,
        height: 400,
        pointerEvents: "none",
      });
    });
  });
});