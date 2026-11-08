"use client";

import type { Presence, CollabUser } from "./liveblocks-config";

interface AvatarStackProps {
  remoteUsers: Presence[];
  currentUser: CollabUser | undefined;
  maxVisible?: number;
}

function getUserId(user: CollabUser | Presence): string {
  return user.id;
}

function getUserName(user: CollabUser | Presence): string {
  return user.name;
}

function getUserAvatarColor(user: CollabUser | Presence): string {
  return user.avatarColor;
}

export function AvatarStack({
  remoteUsers,
  currentUser,
  maxVisible = 4,
}: AvatarStackProps) {
  const allUsers: (CollabUser | Presence)[] = [
    ...(currentUser ? [currentUser] : []),
    ...remoteUsers,
  ];
  const visible = allUsers.slice(0, maxVisible);
  const overflow = allUsers.length - maxVisible;

  if (!allUsers.length) return null;

  return (
    <div className="flex items-center" role="group" aria-label="Pengguna aktif">
      {visible.map((user, i) => (
        <div
          key={getUserId(user)}
          title={getUserName(user)}
          className="relative flex h-7 w-7 items-center justify-center rounded-full border-2 border-surface text-[10px] font-semibold"
          style={{
            backgroundColor: getUserAvatarColor(user),
            marginLeft: i > 0 ? "-8px" : "0",
            zIndex: visible.length - i,
          }}
          aria-label={getUserName(user)}
        >
          {getUserName(user).charAt(0).toUpperCase()}
        </div>
      ))}
      {overflow > 0 && (
        <div
          className="relative flex h-7 w-7 items-center justify-center rounded-full border-2 border-surface bg-muted text-[10px] font-semibold text-ink"
          style={{ marginLeft: "-8px" }}
          aria-label={`${overflow} pengguna lainnya`}
        >
          +{overflow}
        </div>
      )}
    </div>
  );
}