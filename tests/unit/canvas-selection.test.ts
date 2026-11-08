import { describe, expect, it } from "vitest";
import { parseSelectionMessage } from "@/modules/workspace/components/use-canvas-selection";

describe("parseSelectionMessage", () => {
  it("returns valid message for correct type and slot", () => {
    const data = { type: "jioodev:select", slot: "hero-section" };
    const result = parseSelectionMessage(data);
    expect(result).toEqual({ type: "jioodev:select", slot: "hero-section" });
  });

  it("returns valid message with null slot", () => {
    const data = { type: "jioodev:select", slot: null };
    const result = parseSelectionMessage(data);
    expect(result).toEqual({ type: "jioodev:select", slot: null });
  });

  it("returns valid message with alphanumeric slot", () => {
    const data = { type: "jioodev:select", slot: "section123" };
    const result = parseSelectionMessage(data);
    expect(result).toEqual({ type: "jioodev:select", slot: "section123" });
  });

  it("returns valid message with hyphenated slot", () => {
    const data = { type: "jioodev:select", slot: "hero-section-1" };
    const result = parseSelectionMessage(data);
    expect(result).toEqual({ type: "jioodev:select", slot: "hero-section-1" });
  });

  it("returns null for invalid type", () => {
    const data = { type: "other:select", slot: "hero" };
    expect(parseSelectionMessage(data)).toBeNull();
  });

  it("returns null for missing type", () => {
    const data = { slot: "hero" };
    expect(parseSelectionMessage(data)).toBeNull();
  });

  it("returns null for invalid slot format (underscore)", () => {
    const data = { type: "jioodev:select", slot: "hero_section" };
    expect(parseSelectionMessage(data)).toBeNull();
  });

  it("returns null for invalid slot format (space)", () => {
    const data = { type: "jioodev:select", slot: "hero section" };
    expect(parseSelectionMessage(data)).toBeNull();
  });

  it("returns null for invalid slot format (special chars)", () => {
    const data = { type: "jioodev:select", slot: "hero@section" };
    expect(parseSelectionMessage(data)).toBeNull();
  });

  it("returns null for non-string slot", () => {
    const data = { type: "jioodev:select", slot: 123 };
    expect(parseSelectionMessage(data)).toBeNull();
  });

  it("returns null for non-object input", () => {
    expect(parseSelectionMessage(null)).toBeNull();
    expect(parseSelectionMessage(undefined)).toBeNull();
    expect(parseSelectionMessage("string")).toBeNull();
    expect(parseSelectionMessage(123)).toBeNull();
    expect(parseSelectionMessage(true)).toBeNull();
    expect(parseSelectionMessage([])).toBeNull();
  });

  it("returns null for empty object", () => {
    expect(parseSelectionMessage({})).toBeNull();
  });

  it("returns null when slot is empty string", () => {
    const data = { type: "jioodev:select", slot: "" };
    expect(parseSelectionMessage(data)).toBeNull();
  });

  it("returns correct type structure for valid message", () => {
    const data = { type: "jioodev:select", slot: "test-slot" };
    const result = parseSelectionMessage(data);
    expect(result).not.toBeNull();
    if (result) {
      expect(result.type).toBe("jioodev:select");
      expect(typeof result.slot).toBe("string");
    }
  });

  it("returns correct type structure for null slot", () => {
    const data = { type: "jioodev:select", slot: null };
    const result = parseSelectionMessage(data);
    expect(result).not.toBeNull();
    if (result) {
      expect(result.type).toBe("jioodev:select");
      expect(result.slot).toBeNull();
    }
  });
});