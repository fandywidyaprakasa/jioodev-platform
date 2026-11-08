"use client";

export interface SectionRect {
  slot: string;
  top: number;
  left: number;
  width: number;
  height: number;
}

export interface RectInput {
  slot: string;
  top: number;
  left: number;
  width: number;
  height: number;
}

export function rectsFromElements(elements: Element[]): SectionRect[] {
  const rects: SectionRect[] = [];
  for (const element of elements) {
    const slot = element.getAttribute("data-slot");
    if (!slot) continue;
    const rect = element.getBoundingClientRect();
    rects.push({
      slot,
      top: rect.top,
      left: rect.left,
      width: rect.width,
      height: rect.height,
    });
  }
  return rects;
}

export function measureSectionRects(
  iframe: HTMLIFrameElement | null
): SectionRect[] {
  if (!iframe) return [];
  try {
    const doc = iframe.contentDocument;
    if (!doc) return [];
    const elements = doc.querySelectorAll<HTMLElement>("[data-slot]");
    return rectsFromElements(Array.from(elements));
  } catch {
    return [];
  }
}

export function findSectionAtPoint(
  rects: SectionRect[],
  x: number,
  y: number
): string | null {
  for (const rect of rects) {
    if (
      x >= rect.left &&
      x < rect.left + rect.width &&
      y >= rect.top &&
      y < rect.top + rect.height
    ) {
      return rect.slot;
    }
  }
  return null;
}

export function overlayStyle(rect: SectionRect): React.CSSProperties {
  return {
    position: "absolute",
    top: rect.top,
    left: rect.left,
    width: rect.width,
    height: rect.height,
    pointerEvents: "none",
  };
}