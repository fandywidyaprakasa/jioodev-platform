"use client";

import { useState } from "react";
import { Button, Card, useToast } from "@/shared/ui";

const FLAGS = [
  ["mockAuth", "Mock auth (non-produksi)", false],
  ["autoDeploy", "Auto-provision deploy", false],
  ["qrisSandbox", "QRIS sandbox", true],
  ["emailWorker", "Notification worker", false],
] as const;

export function AdminSettings() {
  const { toast } = useToast();
  const [flags, setFlags] = useState<Record<string, boolean>>(
    Object.fromEntries(FLAGS.map(([key, , value]) => [key, value])),
  );

  return (
    <Card title="Feature flags" description="Perubahan berlaku pada environment aktif.">
      <ul className="divide-y divide-line">
        {FLAGS.map(([key, label]) => (
          <li key={key} className="flex items-center justify-between gap-3 py-3 text-sm">
            <span className="font-medium text-ink">{label}</span>
            <input
              type="checkbox"
              checked={flags[key]}
              onChange={(event) =>
                setFlags((current) => ({ ...current, [key]: event.target.checked }))
              }
            />
          </li>
        ))}
      </ul>
      <div className="mt-4 flex justify-end">
        <Button onClick={() => toast({ title: "Feature flags tersimpan" })}>Simpan</Button>
      </div>
    </Card>
  );
}
