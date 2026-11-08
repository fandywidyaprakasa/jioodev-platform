"use client";

import { useEffect } from "react";

function isHTMLElement(target: EventTarget | null): target is HTMLElement {
  if (target === null) return false;
  if (typeof HTMLElement !== "undefined" && target instanceof HTMLElement) return true;
  const t = target as unknown as Record<string, unknown>;
  return (
    typeof t.tagName === "string" &&
    typeof t.isContentEditable === "boolean"
  );
}

export function isEditableTarget(target: EventTarget | null): boolean {
  if (!isHTMLElement(target)) return false;
  const tag = target.tagName.toLowerCase();
  if (tag === "input" || tag === "textarea" || tag === "select") return true;
  if (target.isContentEditable) return true;
  return false;
}

export interface ResolveCanvasKeyInput {
  key: string;
  metaKey: boolean;
  ctrlKey: boolean;
  shiftKey: boolean;
  editable: boolean;
  index: number;
  count: number;
}

export type CanvasKeyAction =
  | { type: "clear" }
  | { type: "previous" }
  | { type: "next" }
  | { type: "undo" }
  | { type: "redo" };

export function resolveCanvasKey(
  input: ResolveCanvasKeyInput
): CanvasKeyAction | null {
  const { key, metaKey, ctrlKey, shiftKey, editable, index, count } = input;

  if (editable || count === 0) return null;

  switch (key) {
    case "Escape":
      return { type: "clear" };
    case "ArrowUp":
      return { type: "previous" };
    case "ArrowDown":
      return { type: "next" };
    case "z":
    case "Z":
      if (metaKey || ctrlKey) {
        return shiftKey ? { type: "redo" } : { type: "undo" };
      }
      return null;
    default:
      return null;
  }
}

export interface UseCanvasKeyboardOptions {
  enabled: boolean;
  slots: readonly unknown[];
  selectedSlot: number | null;
  onSelect: (index: number) => void;
  onClear: () => void;
  onUndo: () => void;
  onRedo: () => void;
}

export function useCanvasKeyboard({
  enabled,
  slots,
  selectedSlot,
  onSelect,
  onClear,
  onUndo,
  onRedo,
}: UseCanvasKeyboardOptions): void {
  useEffect(() => {
    if (!enabled) return;

    const handler = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target)) return;

      const action = resolveCanvasKey({
        key: event.key,
        metaKey: event.metaKey,
        ctrlKey: event.ctrlKey,
        shiftKey: event.shiftKey,
        editable: false,
        index: selectedSlot ?? -1,
        count: slots.length,
      });

      if (!action) return;

      event.preventDefault();

      switch (action.type) {
        case "clear":
          onClear();
          break;
        case "previous":
          if (selectedSlot !== null && selectedSlot > 0) {
            onSelect(selectedSlot - 1);
          }
          break;
        case "next":
          if (selectedSlot !== null && selectedSlot < slots.length - 1) {
            onSelect(selectedSlot + 1);
          }
          break;
        case "undo":
          onUndo();
          break;
        case "redo":
          onRedo();
          break;
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [enabled, slots, selectedSlot, onSelect, onClear, onUndo, onRedo]);
}