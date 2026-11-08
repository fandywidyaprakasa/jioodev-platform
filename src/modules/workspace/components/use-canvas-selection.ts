"use client";

import { useCallback, useEffect, useRef } from "react";

export interface CanvasSelectionMessage {
  type: "jioodev:select";
  slot: string | null;
}

const SLOT_REGEX = /^[A-Za-z0-9-]+$/;

export function parseSelectionMessage(data: unknown): CanvasSelectionMessage | null {
  if (!data || typeof data !== "object") return null;

  const obj = data as Record<string, unknown>;
  if (obj.type !== "jioodev:select") return null;

  const slot = obj.slot;
  if (slot !== null && (typeof slot !== "string" || !SLOT_REGEX.test(slot))) {
    return null;
  }

  return { type: "jioodev:select", slot: slot as string | null };
}

export interface UseCanvasSelectionOptions {
  iframeRef: React.RefObject<HTMLIFrameElement | null>;
  onSelect: (slot: string | null) => void;
}

export interface UseCanvasSelectionReturn {
  attachSelection: () => void;
  clearSelection: () => void;
}

export function useCanvasSelection({
  iframeRef,
  onSelect,
}: UseCanvasSelectionOptions): UseCanvasSelectionReturn {
  const clickHandlerRef = useRef<((event: MouseEvent) => void) | null>(null);
  const messageHandlerRef = useRef<((event: MessageEvent) => void) | null>(null);
  const attachedRef = useRef(false);

  const sendSelection = useCallback(
    (slot: string | null) => {
      const iframe = iframeRef.current;
      if (!iframe?.contentWindow) return;

      const message: CanvasSelectionMessage = { type: "jioodev:select", slot };
      iframe.contentWindow.postMessage(message, "*");
    },
    [iframeRef]
  );

  const attachSelection = useCallback(() => {
    const iframe = iframeRef.current;
    if (!iframe?.contentDocument || attachedRef.current) return;

    try {
      const doc = iframe.contentDocument;
      const win = iframe.contentWindow;
      if (!win) return;

      const clickHandler = (event: MouseEvent) => {
        const target = event.target as HTMLElement | null;
        if (!target) return;

        const slotElement = target.closest("[data-slot]");
        if (!slotElement) {
          sendSelection(null);
          return;
        }

        const slot = slotElement.getAttribute("data-slot");
        if (slot && SLOT_REGEX.test(slot)) {
          event.preventDefault();
          sendSelection(slot);
        } else {
          sendSelection(null);
        }
      };

      const messageHandler = (event: MessageEvent) => {
        if (event.source !== win) return;

        const parsed = parseSelectionMessage(event.data);
        if (parsed) {
          onSelect(parsed.slot);
        }
      };

      doc.addEventListener("click", clickHandler);
      window.addEventListener("message", messageHandler);

      clickHandlerRef.current = clickHandler;
      messageHandlerRef.current = messageHandler;
      attachedRef.current = true;
    } catch {
      // Cross-origin or other access error - silently fail
    }
  }, [iframeRef, onSelect, sendSelection]);

  const clearSelection = useCallback(() => {
    sendSelection(null);
  }, [sendSelection]);

  useEffect(() => {
    attachSelection();

    const iframe = iframeRef.current;
    return () => {
      if (!iframe?.contentDocument) return;

      try {
        const doc = iframe.contentDocument;
        if (clickHandlerRef.current) {
          doc.removeEventListener("click", clickHandlerRef.current);
        }
        if (messageHandlerRef.current) {
          window.removeEventListener("message", messageHandlerRef.current);
        }
      } catch {
        // Cross-origin cleanup - silently fail
      }

      clickHandlerRef.current = null;
      messageHandlerRef.current = null;
      attachedRef.current = false;
    };
  }, [attachSelection, iframeRef]);

  return { attachSelection, clearSelection };
}