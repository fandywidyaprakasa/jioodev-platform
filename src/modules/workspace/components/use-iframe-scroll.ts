"use client";

import { useEffect, useRef, useCallback, type RefObject } from "react";

export function readScrollTop(doc: Document | null): number {
  if (!doc) return 0;
  const scrollingElement = doc.scrollingElement;
  if (!scrollingElement) return 0;
  return scrollingElement.scrollTop;
}

export function writeScrollTop(doc: Document | null, y: number): void {
  if (!doc) return;
  const scrollingElement = doc.scrollingElement;
  if (!scrollingElement) return;
  scrollingElement.scrollTop = clampScroll(y, scrollingElement.scrollHeight - scrollingElement.clientHeight);
}

export function clampScroll(value: number, max: number): number {
  if (max < 0) max = 0;
  if (value < 0) return 0;
  if (value > max) return max;
  return value;
}

export interface UseIframeScrollPreservationReturn {
  handleLoad: () => void;
}

export function useIframeScrollPreservation(
  iframeRef: RefObject<HTMLIFrameElement>
): UseIframeScrollPreservationReturn {
  const savedScrollTop = useRef<number>(0);
  const scrollHandlerRef = useRef<(() => void) | null>(null);

  const handleScroll = useCallback(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    try {
      const doc = iframe.contentDocument;
      if (!doc) return;
      savedScrollTop.current = readScrollTop(doc);
    } catch {
      // Cross-origin access blocked
    }
  }, [iframeRef]);

  const handleLoad = useCallback(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    try {
      const doc = iframe.contentDocument;
      if (!doc) return;

      const restore = () => {
        writeScrollTop(doc, savedScrollTop.current);
      };

      requestAnimationFrame(restore);

      if (scrollHandlerRef.current) {
        doc.removeEventListener("scroll", scrollHandlerRef.current, { passive: true } as AddEventListenerOptions);
      }
      scrollHandlerRef.current = handleScroll;
      doc.addEventListener("scroll", scrollHandlerRef.current, { passive: true } as AddEventListenerOptions);
    } catch {
      // Cross-origin access blocked
    }
  }, [iframeRef, handleScroll]);

  useEffect(() => {
    return () => {
      // eslint-disable-next-line react-hooks/exhaustive-deps
      const iframe = iframeRef.current;
      if (!iframe) return;
      try {
        const doc = iframe.contentDocument;
        if (doc && scrollHandlerRef.current) {
          doc.removeEventListener("scroll", scrollHandlerRef.current, { passive: true } as AddEventListenerOptions);
        }
      } catch {
        // Cross-origin access blocked
      }
    };
  }, [iframeRef]);

  return { handleLoad };
}