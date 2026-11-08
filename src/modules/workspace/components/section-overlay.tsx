"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import {
  measureSectionRects,
  findSectionAtPoint,
  overlayStyle,
  type SectionRect,
} from "./section-overlay-geometry";

interface SectionOverlayProps {
  iframeRef: RefObject<HTMLIFrameElement>;
  selectedSlot: string;
  onHoverSlot?: (slot: string | null) => void;
  slotLabel?: (slot: string) => string;
  className?: string;
  selectedToolbar?: React.ReactNode;
}

export function SectionOverlay({
  iframeRef,
  selectedSlot,
  onHoverSlot,
  slotLabel = (slot) => slot,
  className,
  selectedToolbar,
}: SectionOverlayProps) {
  const [rects, setRects] = useState<SectionRect[]>([]);
  const [hoveredSlot, setHoveredSlot] = useState<string | null>(null);
  const rafIdRef = useRef<number | null>(null);
  const isMountedRef = useRef(true);

  const computeRects = useCallback(() => {
    if (!isMountedRef.current) return;
    const newRects = measureSectionRects(iframeRef.current);
    setRects(newRects);
  }, [iframeRef]);

  const throttledComputeRects = useCallback(() => {
    if (rafIdRef.current) return;
    rafIdRef.current = requestAnimationFrame(() => {
      rafIdRef.current = null;
      computeRects();
    });
  }, [computeRects]);

  useEffect(() => {
    isMountedRef.current = true;
    computeRects();

    const iframe = iframeRef.current;
    if (!iframe) return;

    const contentWindow = iframe.contentWindow;
    if (!contentWindow) return;

    const handleScroll = throttledComputeRects;
    const handleResize = throttledComputeRects;

    contentWindow.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleResize, { passive: true });

    return () => {
      contentWindow.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleResize);
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      isMountedRef.current = false;
    };
  }, [iframeRef, selectedSlot, computeRects, throttledComputeRects]);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    try {
      const doc = iframe.contentDocument;
      if (!doc) return;

      const handleMouseMove = (event: MouseEvent) => {
        const slot = findSectionAtPoint(rects, event.clientX, event.clientY);
        setHoveredSlot(slot);
        onHoverSlot?.(slot);
      };

      doc.addEventListener("mousemove", handleMouseMove);

      return () => {
        doc.removeEventListener("mousemove", handleMouseMove);
      };
    } catch {
      return;
    }
  }, [iframeRef, rects, onHoverSlot]);

  const selectedRect = rects.find((r) => r.slot === selectedSlot);
  const hoveredRect =
    hoveredSlot && hoveredSlot !== selectedSlot
      ? rects.find((r) => r.slot === hoveredSlot)
      : null;

  return (
    <div
      data-testid="workspace-section-overlay"
      className={className}
      aria-hidden="true"
      style={{ position: "relative", pointerEvents: "none" }}
    >
      {selectedRect && (
        <>
          <div
            style={{
              ...overlayStyle(selectedRect),
              border: "2px solid var(--color-accent, #3b82f6)",
              boxSizing: "border-box",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: -20,
                left: 0,
                background: "var(--color-accent, #3b82f6)",
                color: "var(--color-on-accent, white)",
                fontSize: "10px",
                fontWeight: 600,
                padding: "2px 6px",
                borderRadius: 0,
                whiteSpace: "nowrap",
                boxSizing: "border-box",
              }}
            >
              {slotLabel(selectedSlot)}
            </div>
          </div>
          {selectedToolbar && (
            <div
              style={{
                position: "absolute",
                top: selectedRect.top + 4,
                left: selectedRect.left + selectedRect.width - 4,
                transform: "translateX(-100%)",
                pointerEvents: "auto",
                zIndex: 50,
              }}
            >
              {selectedToolbar}
            </div>
          )}
        </>
      )}
      {hoveredRect && (
        <div
          style={{
            ...overlayStyle(hoveredRect),
            border: "1px dashed var(--color-muted, #6b7280)",
            boxSizing: "border-box",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: -20,
              left: 0,
              background: "var(--color-muted, #6b7280)",
              color: "white",
              fontSize: "10px",
              fontWeight: 600,
              padding: "2px 6px",
              borderRadius: 0,
              whiteSpace: "nowrap",
              boxSizing: "border-box",
            }}
          >
            {hoveredSlot ? slotLabel(hoveredSlot) : ""}
          </div>
        </div>
      )}
    </div>
  );
}