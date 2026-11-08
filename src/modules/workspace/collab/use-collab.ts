"use client";

import { useCallback, useEffect } from "react";
import { useUpdateMyPresence } from "./liveblocks-config";
import type { CollabConfig, CollabStatus, CursorPosition, Presence } from "./liveblocks-config";
import { isCollabConfigured } from "./liveblocks-config";

interface UseCollabOptions {
  config: CollabConfig | null;
  selectedSlot: string | null;
  /** Called when connection status changes (from CollabProvider). */
  onStatusChange?: (status: CollabStatus) => void;
}

interface UseCollabResult {
  status: CollabStatus;
  updateCursor: (cursor: CursorPosition | null) => void;
  updateSelectedSlot: (slot: string | null) => void;
  updateEditingField: (field: string | null) => void;
  isCollabActive: boolean;
}

/** Hook to manage Liveblocks presence for the workspace canvas. */
export function useCollab({
  config,
  selectedSlot,
  onStatusChange,
}: UseCollabOptions): UseCollabResult {
  const updateMyPresence = useUpdateMyPresence();
  const active = config !== null && isCollabConfigured;
  const status: CollabStatus = active ? "connecting" : "unconfigured";

  useEffect(() => {
    onStatusChange?.(status);
  }, [status, onStatusChange]);

  // Cast to Partial<Presence> — Presence has [key: string]: any index, so this satisfies
  const cast = (p: { cursor: CursorPosition | null }) =>
    p as unknown as Partial<Presence>;

  const updateCursor = useCallback(
    (cursor: CursorPosition | null) => {
      if (!config) return;
      updateMyPresence(cast({ cursor }));
    },
    [config, updateMyPresence],
  );

  const updateSelectedSlot = useCallback(
    (slot: string | null) => {
      if (!config) return;
      updateMyPresence({ selectedSlot: slot } as Partial<Presence>);
    },
    [config, updateMyPresence],
  );

  const updateEditingField = useCallback(
    (field: string | null) => {
      if (!config) return;
      updateMyPresence({ editingField: field } as Partial<Presence>);
    },
    [config, updateMyPresence],
  );

  // Sync selected slot to presence
  useEffect(() => {
    if (!active) return;
    updateSelectedSlot(selectedSlot);
  }, [selectedSlot, updateSelectedSlot, active]);

  return {
    status,
    updateCursor,
    updateSelectedSlot,
    updateEditingField,
    isCollabActive: active,
  };
}
