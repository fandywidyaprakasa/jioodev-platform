"use client";

import { useEffect, useState, useTransition } from "react";
import { api } from "@/shared/lib/api";
import { Button, Card, useToast } from "@/shared/ui";

const ITEMS = [
  ["email", "Email transaksi", "Invoice, konfirmasi pembayaran, dan status deploy."],
  ["preview", "Preview siap", "Beri tahu saat varian desain selesai."],
  ["product", "Update produk", "Fitur baru dan perubahan penting."],
] as const;

const DEFAULTS = { email: true, preview: true, product: false };

export function NotificationSettings() {
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const [enabled, setEnabled] = useState<Record<string, boolean>>(DEFAULTS);

  useEffect(() => {
    let active = true;
    api.account
      .profile()
      .then((profile) => {
        if (active && profile.notificationsPref) {
          setEnabled({ ...DEFAULTS, ...profile.notificationsPref });
        }
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  function save() {
    startTransition(async () => {
      try {
        await api.account.updateProfile({ notificationsPref: enabled });
        toast({ title: "Preferensi notifikasi tersimpan" });
      } catch (error) {
        toast({
          title: "Gagal menyimpan preferensi",
          description: error instanceof Error ? error.message : "Coba lagi.",
          variant: "error",
        });
      }
    });
  }

  return (
    <Card title="Notifikasi">
      <ul className="divide-y divide-line">
        {ITEMS.map(([key, title, description]) => (
          <li key={key} className="flex items-start gap-3 py-3">
            <input
              id={`notif-${key}`}
              type="checkbox"
              className="mt-1"
              checked={enabled[key] ?? false}
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
        <Button onClick={save} loading={pending}>
          Simpan Preferensi
        </Button>
      </div>
    </Card>
  );
}
