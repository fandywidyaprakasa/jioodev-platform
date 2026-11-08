import { describe, expect, it } from "vitest";
import { HTML_ADAPTER_DESCRIPTOR } from "@/modules/adapters";
import {
  WORKSPACE_EDITOR_OPERATIONS,
  negotiateWorkspaceCapabilities,
} from "@/modules/workspace/components/workspace-capabilities";

describe("workspace editor capability negotiation", () => {
  it("supports the default LAND+HTML adapter and every advertised operation", () => {
    const capabilities = negotiateWorkspaceCapabilities();

    expect(capabilities.supported).toBe(true);
    expect(capabilities.adapterId).toBe("html");
    expect(capabilities.adapterVersion).toBe("1");
    expect(capabilities.operations).toEqual(
      new Set(HTML_ADAPTER_DESCRIPTOR.editor_operations),
    );
    expect(capabilities.reason).toBeNull();

    for (const operation of WORKSPACE_EDITOR_OPERATIONS) {
      expect(capabilities.isSupported(operation)).toBe(true);
      expect(capabilities.reasonFor(operation)).toBeNull();
    }
  });

  it("accepts an explicitly supported adapter id and version", () => {
    const capabilities = negotiateWorkspaceCapabilities({
      adapterId: "html",
      adapterVersion: "1",
    });

    expect(capabilities.supported).toBe(true);
    expect(capabilities.isSupported("section.content.edit")).toBe(true);
  });

  it("hides operations that the adapter descriptor does not advertise", () => {
    const capabilities = negotiateWorkspaceCapabilities({
      descriptor: {
        ...HTML_ADAPTER_DESCRIPTOR,
        editor_operations: ["section.toggle", "undo.redo"],
      },
    });

    expect(capabilities.supported).toBe(true);
    expect(capabilities.isSupported("section.toggle")).toBe(true);
    expect(capabilities.isSupported("undo.redo")).toBe(true);
    expect(capabilities.isSupported("section.reorder")).toBe(false);
    expect(capabilities.reasonFor("section.reorder")).toContain("section.reorder");
  });

  it("keeps deferred operations disabled even for the supported adapter", () => {
    const capabilities = negotiateWorkspaceCapabilities();

    for (const operation of [
      "navigation.manage",
      "inline.edit",
      "layout.drag",
      "style.per_element",
    ]) {
      expect(capabilities.isSupported(operation)).toBe(false);
      expect(capabilities.reasonFor(operation)).toContain(operation);
    }
  });

  it("fails closed for an unknown adapter id", () => {
    const capabilities = negotiateWorkspaceCapabilities({ adapterId: "next" });

    expect(capabilities.supported).toBe(false);
    expect(capabilities.operations.size).toBe(0);
    expect(capabilities.isSupported("section.toggle")).toBe(false);
    expect(capabilities.reasonFor("section.toggle")).toContain("next");
  });

  it("fails closed for an unknown adapter version", () => {
    const capabilities = negotiateWorkspaceCapabilities({ adapterVersion: "2" });

    expect(capabilities.supported).toBe(false);
    expect(capabilities.operations.size).toBe(0);
    expect(capabilities.isSupported("theme.select")).toBe(false);
    expect(capabilities.reasonFor("theme.select")).toContain("2");
  });

  it("treats empty adapter id and version as unknown", () => {
    const emptyId = negotiateWorkspaceCapabilities({ adapterId: "" });
    const emptyVersion = negotiateWorkspaceCapabilities({ adapterVersion: "" });

    expect(emptyId.supported).toBe(false);
    expect(emptyVersion.supported).toBe(false);
    expect(emptyId.isSupported("page.update")).toBe(false);
    expect(emptyVersion.isSupported("page.update")).toBe(false);
  });

  it("fails closed when the supplied descriptor is not the supported HTML adapter", () => {
    const capabilities = negotiateWorkspaceCapabilities({
      descriptor: {
        ...HTML_ADAPTER_DESCRIPTOR,
        adapter_version: "2",
      },
    });

    expect(capabilities.supported).toBe(false);
    expect(capabilities.operations.size).toBe(0);
    expect(capabilities.isSupported("media.upload")).toBe(false);
    expect(capabilities.reasonFor("media.upload")).toContain("tidak didukung");
  });
});
