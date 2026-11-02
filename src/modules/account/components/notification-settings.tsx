"use client";

import { useState } from "react";
import { Button, Card, useToast } from "@/shared/ui";

const ITEMS = [
  ["email", "Email transaksi", "Invoice, konfirmasi pembayaran, dan status deploy."],
  ["preview", "Preview siap", "Beri tahu saat varian desain selesai."],
  ["product", "Update produk", "Fitur baru dan perubahan penting."],
];

export function NotificationSettings() {
  const { toast } = useToast();
  const [enabled, setEnabled] = useState<Record<string, boolean>>({
    email: true,
    preview: true,
    product: false,
  });

  return (
    <Card title="Notifikasi">
      <ul className="divide-y divide-line">
        {ITEMS.map(([key, title, description]) => (
          <li key={key} className="flex items-start gap-3 py-3">
            <input
              id={`notif-${key}`}
              type="checkbox"
              checked={enabled[key]}
              onChange={(event) =>
                setEnabled((current) => ({ ...current, [key]: event.target.checked }))
              }
            />
            <label htmlFor={`notif-${key}`} className="text-sm">
              <span className="block font-medium text-ink">{title}</span>
              <span className="block text-muted">{description}</span>
            </label>
          </li>
        ))}
      </ul>
      <div className="mt-4 flex justify-end">
        <Button onClick={() => toast({ title: "Preferensi notifikasi tersimpan" })}>
          Simpan Preferensi
        </Button>
      </div>
    </Card>
  );
}
