import { describe, expect, it, vi } from "vitest";
import {
  readScrollTop,
  writeScrollTop,
  clampScroll,
} from "@/modules/workspace/components/use-iframe-scroll";

describe("iframe scroll helpers", () => {
  describe("clampScroll", () => {
    it("clamps negative value to 0", () => {
      expect(clampScroll(-10, 100)).toBe(0);
    });

    it("clamps value above max to max", () => {
      expect(clampScroll(150, 100)).toBe(100);
    });

    it("returns value within range unchanged", () => {
      expect(clampScroll(50, 100)).toBe(50);
    });

    it("clamps when max is negative (treats as 0)", () => {
      expect(clampScroll(10, -5)).toBe(0);
      expect(clampScroll(-10, -5)).toBe(0);
    });

    it("handles zero max", () => {
      expect(clampScroll(0, 0)).toBe(0);
      expect(clampScroll(10, 0)).toBe(0);
    });
  });

  describe("readScrollTop", () => {
    it("returns 0 for null document", () => {
      expect(readScrollTop(null)).toBe(0);
    });

    it("returns 0 when scrollingElement is null", () => {
      const doc = { scrollingElement: null } as unknown as Document;
      expect(readScrollTop(doc)).toBe(0);
    });

    it("returns scrollTop from scrollingElement", () => {
      const scrollingElement = { scrollTop: 42 };
      const doc = { scrollingElement } as unknown as Document;
      expect(readScrollTop(doc)).toBe(42);
    });
  });

  describe("writeScrollTop", () => {
    it("does nothing for null document", () => {
      expect(() => writeScrollTop(null, 100)).not.toThrow();
    });

    it("does nothing when scrollingElement is null", () => {
      const doc = { scrollingElement: null } as unknown as Document;
      expect(() => writeScrollTop(doc, 100)).not.toThrow();
    });

    it("sets scrollTop on scrollingElement clamped to max", () => {
      const scrollingElement = { scrollTop: 0, scrollHeight: 500, clientHeight: 200 };
      const doc = { scrollingElement } as unknown as Document;

      writeScrollTop(doc, 100);
      expect(scrollingElement.scrollTop).toBe(100);

      writeScrollTop(doc, 400);
      expect(scrollingElement.scrollTop).toBe(300);

      writeScrollTop(doc, -50);
      expect(scrollingElement.scrollTop).toBe(0);
    });
  });
});