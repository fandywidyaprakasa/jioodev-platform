"use client";

import { useEffect, useState, useTransition } from "react";
import { api } from "@/shared/lib/api";
import { Button, Card, useToast } from "@/shared/ui";

const FLAGS = [["autoDeploy", "Auto-provision deploy setelah pembayaran"]] as const;

export function AdminSettings() {
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const [flags, setFlags] = useState<Record<string, boolean>>({
    autoDeploy: false,
  });

  useEffect(() => {
    let active = true;
    api.admin
      .settings()
      .then((value) => {
        if (active) setFlags((current) => ({ ...current, ...value }));
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  function save() {
    startTransition(async () => {
      try {
        await api.admin.updateSettings(flags);
        toast({ title: "Feature flags tersimpan" });
      } catch (error) {
        toast({
          title: "Gagal menyimpan feature flags",
          description: error instanceof Error ? error.message : "Coba lagi.",
          variant: "error",
        });
      }
    });
  }

  return (
    <div className="space-y-4">
      <Card title="Feature flags" description="Perubahan berlaku pada environment aktif.">
        <ul className="divide-y divide-line">
          {FLAGS.map(([key, label]) => (
            <li key={key} className="flex items-center justify-between gap-3 py-3 text-sm">
              <span className="font-medium text-ink">{label}</span>
              <input
                type="checkbox"
                aria-label={label}
                checked={flags[key] ?? false}
                onChange={(event) =>
                  setFlags((current) => ({ ...current, [key]: event.target.checked }))
                }
              />
            </li>
          ))}
        </ul>
        <div className="mt-4 flex justify-end">
          <Button onClick={save} loading={pending}>Simpan</Button>
        </div>
      </Card>
      <Card title="Konfigurasi environment" description="Perubahan memerlukan redeploy.">
        <ul className="space-y-2 text-sm text-muted">
          <li>
            Mock auth dikontrol oleh <code className="text-xs">JIOODEV_AUTH_MODE</code>.
          </li>
          <li>
            QRIS sandbox dikontrol oleh kredensial <code className="text-xs">QRIS_*</code>.
          </li>
          <li>Notification worker berjalan sebagai proses cron terpisah.</li>
        </ul>
      </Card>
    </div>
  );
}
