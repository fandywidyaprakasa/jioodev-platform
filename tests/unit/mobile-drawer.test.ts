import { describe, expect, it, vi } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MobileDrawer } from "@/modules/workspace/components/mobile-drawer";
import type { FriendlyField } from "@/modules/workspace/components/inspector-field";

function findElement(element: any, predicate: (el: any) => boolean): any {
  if (!element) return null;
  if (predicate(element)) return element;
  const children = element.props?.children;
  if (Array.isArray(children)) {
    for (const child of children) {
      const found = findElement(child, predicate);
      if (found) return found;
    }
  } else if (children) {
    return findElement(children, predicate);
  }
  return null;
}

describe("MobileDrawer", () => {
  const friendlyFields: FriendlyField[] = [
    {
      path: ["headline"],
      label: "Judul utama",
      value: "Hello",
      type: "text",
      multiline: false,
    },
  ];

  const baseProps = {
    onClose: vi.fn(),
    selectedBlock: {
      slot: "hero",
      variant: "v1",
      enabled: true,
      order: 0,
    },
    variants: [{ code: "v1", name: "Variant 1" }],
    friendlyFields,
    data: { slots: { hero: { name: "Hero Slot" } } },
    can: () => true,
    unsupportedReason: () => "",
    changeVariant: vi.fn(),
    editField: vi.fn(),
    endFieldEdit: vi.fn(),
  };

  it("renders when isOpen is true", () => {
    const html = renderToStaticMarkup(
      React.createElement(MobileDrawer, { ...baseProps, isOpen: true }),
    );
    expect(html).toContain("Inspector");
  });

  it("hides when isOpen is false", () => {
    const html = renderToStaticMarkup(
      React.createElement(MobileDrawer, { ...baseProps, isOpen: false }),
    );
    expect(html).toBe("");
  });

  it("shows selectedBlock slot name", () => {
    const html = renderToStaticMarkup(
      React.createElement(MobileDrawer, { ...baseProps, isOpen: true }),
    );
    expect(html).toContain("Hero Slot");
  });

  it("renders friendly fields", () => {
    const html = renderToStaticMarkup(
      React.createElement(MobileDrawer, { ...baseProps, isOpen: true }),
    );
    expect(html).toContain("Judul utama");
  });

  it("close button calls onClose", () => {
    const onClose = vi.fn();
    const element = MobileDrawer({ ...baseProps, isOpen: true, onClose });
    const button = findElement(
      element,
      (el) => el?.type === "button" && el?.props?.["aria-label"] === "Tutup inspector",
    );
    expect(button).not.toBeNull();
    button.props.onClick();
    expect(onClose).toHaveBeenCalled();
  });
});
