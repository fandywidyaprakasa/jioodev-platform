"use client";

import { createClient } from "@liveblocks/client";
import {
  createRoomContext,
  RoomProvider as _RP,
  useStatus,
  useRoom,
  useMyPresence,
  useUpdateMyPresence,
  useOthers,
  useOthersMapped as _useOthersMapped,
  useOthersConnectionIds,
  useOther,
  useBroadcastEvent,
  useEventListener,
  useStorage,
  useMutation,
  useSelf,
} from "@liveblocks/react";
import type { JsonObject, Json } from "@liveblocks/client";

export type { JsonObject };

export interface CursorPosition {
  x: number;
  y: number;
  // Index signature to satisfy JsonObject constraint
  [key: string]: Json | undefined;
}

export interface CollabUser {
  id: string;
  name: string;
  email?: string;
  avatarColor: string;
}

export interface UserPresence {
  cursor: CursorPosition | null;
  selectedSlot: string | null;
  editingField: string | null;
}

/**
 * Presence type for Liveblocks. Must satisfy JsonObject.
 * Using [key: string]: Json | undefined to satisfy the constraint.
 * Runtime still accepts CursorPosition objects.
 */
export type Presence = {
  id: string;
  name: string;
  email?: string;
  avatarColor: string;
  cursor: CursorPosition | null;
  selectedSlot: string | null;
  editingField: string | null;
  // Index signature for JsonObject compatibility
  [key: string]: Json | undefined;
};

export interface CollabConfig {
  publicKey: string;
  roomId: string;
  user: CollabUser;
}

export type CollabStatus = "connected" | "connecting" | "disconnected" | "unconfigured";

const PUBLIC_KEY = process.env.NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY ?? "";

const client = PUBLIC_KEY
  ? createClient({ publicApiKey: PUBLIC_KEY, throttle: 16 })
  : null;

export const isCollabConfigured = client !== null;

/** Minimal storage shape — we only use Presence for now. */
type MyStorage = JsonObject;

function makeCtx() {
  if (!client) return null;
  // Cast to satisfy JsonObject constraint — Presence structure is compatible at runtime
  return createRoomContext<Presence, MyStorage>(client as unknown as Parameters<typeof createRoomContext>[0] /* OpaqueClient */);
}

const ctx = makeCtx();

// Typed exports — ctx is null when unconfigured; consuming components guard with isCollabConfigured first
export const RoomProvider = ctx?.RoomProvider ?? _RP;
export const useOthersMapped = ctx?.useOthersMapped ?? _useOthersMapped;
export const useStorageTyped = ctx?.useStorage ?? useStorage;
export const useMutationTyped = ctx?.useMutation ?? useMutation;
export const useSelfTyped = ctx?.useSelf ?? useSelf;

// Re-export hooks that work with any presence type
export {
  useStatus,
  useRoom,
  useMyPresence,
  useUpdateMyPresence,
  useOthers,
  useOthersConnectionIds,
  useOther,
  useBroadcastEvent,
  useEventListener,
};