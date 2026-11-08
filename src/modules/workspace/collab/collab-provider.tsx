"use client";

import { Suspense, useEffect, type ReactNode } from "react";
import {
  useStatus,
  useOthersMapped,
  RoomProvider,
} from "./liveblocks-config";
import type { CollabConfig, CollabStatus, Presence } from "./liveblocks-config";
import { AvatarStack } from "./avatar-stack";
import { RemoteCursors } from "./remote-cursors";

interface CollabProviderProps {
  config: CollabConfig | null;
  children: ReactNode;
  onStatusChange?: (status: CollabStatus) => void;
}

function CollabInner({
  config,
  children,
  onStatusChange,
}: CollabProviderProps) {
  const others = useOthersMapped((user) => user.presence) as ReadonlyArray<
    readonly [number, Presence]
  >;
  const status = useStatus();

  // Subscribe to status changes
  useEffect(() => {
    const mappedStatus: CollabStatus =
      status === "initial" ? "connecting" : (status as CollabStatus);
    onStatusChange?.(mappedStatus);
  }, [status, onStatusChange]);

  const remoteUsers: Presence[] = others.map(([, presence]) => presence);

  return (
    <div className="relative">
      <div className="absolute right-3 top-3 z-20">
        <AvatarStack remoteUsers={remoteUsers} currentUser={config?.user} />
      </div>
      {children}
      <RemoteCursors remoteUsers={remoteUsers} />
    </div>
  );
}

export function CollabProvider({
  config,
  children,
  onStatusChange,
}: CollabProviderProps) {
  if (!config) {
    return <>{children}</>;
  }

  return (
    <RoomProvider
      id={config.roomId}
      initialPresence={{
        id: config.user.id,
        name: config.user.name,
        email: config.user.email,
        avatarColor: config.user.avatarColor,
        cursor: null,
        selectedSlot: null,
        editingField: null,
      }}
      autoConnect
    >
      <Suspense fallback={<div className="h-4" />}>
        <CollabInner config={config} onStatusChange={onStatusChange}>
          {children}
        </CollabInner>
      </Suspense>
    </RoomProvider>
  );
}