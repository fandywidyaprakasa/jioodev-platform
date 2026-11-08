import { describe, expect, it } from "vitest";
import { isEditableTarget, resolveCanvasKey, type CanvasKeyAction } from "@/modules/workspace/components/use-canvas-keyboard";

function createMockElement(tagName: string, props: Record<string, unknown> = {}): HTMLElement {
  const element = {
    tagName: tagName.toUpperCase(),
    isContentEditable: false,
    ...props,
  } as HTMLElement;
  return element;
}

describe("isEditableTarget", () => {
  it("returns false for null", () => {
    expect(isEditableTarget(null)).toBe(false);
  });

  it("returns false for non-HTMLElement", () => {
    expect(isEditableTarget({} as EventTarget)).toBe(false);
  });

  it("returns true for INPUT", () => {
    const input = createMockElement("input");
    expect(isEditableTarget(input)).toBe(true);
  });

  it("returns true for TEXTAREA", () => {
    const textarea = createMockElement("textarea");
    expect(isEditableTarget(textarea)).toBe(true);
  });

  it("returns true for SELECT", () => {
    const select = createMockElement("select");
    expect(isEditableTarget(select)).toBe(true);
  });

  it("returns true for contentEditable element", () => {
    const div = createMockElement("div", { isContentEditable: true });
    expect(isEditableTarget(div)).toBe(true);
  });

  it("returns false for regular div", () => {
    const div = createMockElement("div");
    expect(isEditableTarget(div)).toBe(false);
  });

  it("returns false for span", () => {
    const span = createMockElement("span");
    expect(isEditableTarget(span)).toBe(false);
  });
});

describe("resolveCanvasKey", () => {
  const baseInput = {
    metaKey: false,
    ctrlKey: false,
    shiftKey: false,
    editable: false,
    index: 1,
    count: 3,
  };

  it("returns clear for Escape", () => {
    const result = resolveCanvasKey({ ...baseInput, key: "Escape" });
    expect(result).toEqual({ type: "clear" });
  });

  it("returns previous for ArrowUp", () => {
    const result = resolveCanvasKey({ ...baseInput, key: "ArrowUp" });
    expect(result).toEqual({ type: "previous" });
  });

  it("returns next for ArrowDown", () => {
    const result = resolveCanvasKey({ ...baseInput, key: "ArrowDown" });
    expect(result).toEqual({ type: "next" });
  });

  it("returns undo for metaKey+z", () => {
    const result = resolveCanvasKey({ ...baseInput, key: "z", metaKey: true });
    expect(result).toEqual({ type: "undo" });
  });

  it("returns undo for ctrlKey+z", () => {
    const result = resolveCanvasKey({ ...baseInput, key: "z", ctrlKey: true });
    expect(result).toEqual({ type: "undo" });
  });

  it("returns redo for metaKey+shift+z", () => {
    const result = resolveCanvasKey({
      ...baseInput,
      key: "z",
      metaKey: true,
      shiftKey: true,
    });
    expect(result).toEqual({ type: "redo" });
  });

  it("returns redo for ctrlKey+shift+z", () => {
    const result = resolveCanvasKey({
      ...baseInput,
      key: "z",
      ctrlKey: true,
      shiftKey: true,
    });
    expect(result).toEqual({ type: "redo" });
  });

  it("returns null for z without modifier", () => {
    const result = resolveCanvasKey({ ...baseInput, key: "z" });
    expect(result).toBeNull();
  });

  it("returns null when editable is true", () => {
    const result = resolveCanvasKey({ ...baseInput, key: "Escape", editable: true });
    expect(result).toBeNull();
  });

  it("returns null when count is 0", () => {
    const result = resolveCanvasKey({ ...baseInput, key: "Escape", count: 0 });
    expect(result).toBeNull();
  });

  it("returns null for unhandled key", () => {
    const result = resolveCanvasKey({ ...baseInput, key: "a" });
    expect(result).toBeNull();
  });

  describe("clamping previous/next", () => {
    it("previous at index 0 returns previous action", () => {
      const result = resolveCanvasKey({
        ...baseInput,
        key: "ArrowUp",
        index: 0,
        count: 3,
      });
      expect(result).toEqual({ type: "previous" });
    });

    it("next at last index returns next action", () => {
      const result = resolveCanvasKey({
        ...baseInput,
        key: "ArrowDown",
        index: 2,
        count: 3,
      });
      expect(result).toEqual({ type: "next" });
    });

    it("previous with index -1 (null selected) returns previous", () => {
      const result = resolveCanvasKey({
        ...baseInput,
        key: "ArrowUp",
        index: -1,
        count: 3,
      });
      expect(result).toEqual({ type: "previous" });
    });
  });

  it("handles uppercase Z", () => {
    const result = resolveCanvasKey({ ...baseInput, key: "Z", metaKey: true });
    expect(result).toEqual({ type: "undo" });
  });

  it("returns redo for metaKey+shift+Z", () => {
    const result = resolveCanvasKey({
      ...baseInput,
      key: "Z",
      metaKey: true,
      shiftKey: true,
    });
    expect(result).toEqual({ type: "redo" });
  });
});