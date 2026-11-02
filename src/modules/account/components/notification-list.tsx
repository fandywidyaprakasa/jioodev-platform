"use client";

import { useState } from "react";
import { dateTimeID } from "@/shared/lib/format";
import { Badge, Button, Empty } from "@/shared/ui";
import type { Notification } from "@/shared/types";

export function NotificationList({ notifications }: { notifications: Notification[] }) {
  const [items, setItems] = useState(notifications);

  if (!items.length) {
    return <Empty title="Tidak ada notifikasi" description="Semua sudah dibaca." />;
  }

  return (
    <ul className="divide-y divide-line rounded-lg border border-line bg-surface">
      {items.map((item) => (
        <li key={item.id} className="flex flex-wrap items-start gap-3 p-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="font-medium text-ink">{item.title}</p>
              {!item.read ? <Badge variant="accent">Baru</Badge> : null}
            </div>
            <p className="mt-1 text-sm text-muted">{item.body}</p>
            <p className="mt-1 text-xs text-muted">{dateTimeID(item.createdAt)}</p>
          </div>
          {!item.read ? (
            <Button
              size="sm"
              variant="secondary"
              onClick={() =>
                setItems((current) =>
                  current.map((entry) =>
                    entry.id === item.id ? { ...entry, read: true } : entry,
                  ),
                )
              }
            >
              Tandai dibaca
            </Button>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
