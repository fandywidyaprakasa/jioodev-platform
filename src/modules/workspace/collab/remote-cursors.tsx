"use client";

import type { Presence } from "./liveblocks-config";

interface RemoteCursorsProps {
  remoteUsers: Presence[];
}

function RemoteCursor({ user }: { user: Presence }) {
  const { cursor, name, avatarColor } = user;
  if (!cursor) return null;

  return (
    <div
      className="pointer-events-none fixed z-50 transition-all duration-75"
      style={{
        left: cursor.x,
        top: cursor.y,
        transform: "translate(-50%, -50%)",
      }}
      aria-label={`Kursor ${name}`}
    >
      <div
        className="h-1.5 w-1.5 rounded-full border-2"
        style={{ backgroundColor: avatarColor, borderColor: "white" }}
      />
      <div
        className="absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap rounded px-1.5 py-0.5 text-[10px] text-white"
        style={{ backgroundColor: avatarColor }}
      >
        {name}
      </div>
    </div>
  );
}

export function RemoteCursors({ remoteUsers }: RemoteCursorsProps) {
  return (
    <>
      {remoteUsers.map((user) => (
        <RemoteCursor key={user.id} user={user} />
      ))}
    </>
  );
}
