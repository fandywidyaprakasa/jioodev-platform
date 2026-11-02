"use client";

import { useState, useTransition } from "react";
import { rupiah, dateTimeID } from "@/shared/lib/format";
import { api } from "@/shared/lib/api";
import { Button, Card, StatusBadge, useToast } from "@/shared/ui";
import type { Payment } from "@/shared/types";

export function QrisPanel({ payment }: { payment: Payment }) {
  const { toast } = useToast();
  const [current, setCurrent] = useState(payment);
  const [pending, startTransition] = useTransition();

  function refresh() {
    startTransition(async () => {
      try {
        const updated = await api.payments.refresh(current.id);
        setCurrent(updated);
        toast({
          title: "Status diperbarui",
          description: `Status saat ini: ${updated.status}.`,
        });
      } catch (error) {
        toast({
          title: "Gagal memeriksa status",
          description: error instanceof Error ? error.message : "Coba lagi.",
          variant: "error",
        });
      }
    });
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
      <Card title="QRIS" description="Pindai dengan aplikasi pembayaran.">
        <div className="mx-auto grid aspect-square max-w-[260px] grid-cols-8 gap-1 rounded-md border border-line bg-surface p-3">
          {Array.from({ length: 64 }).map((_, index) => (
            <span
              key={index}
              className={index % 3 === 0 || index % 7 === 0 ? "bg-ink" : "bg-paper"}
            />
          ))}
        </div>
        <p className="mt-3 break-all text-center text-xs text-muted">{current.qrString}</p>
      </Card>
      <Card title="Detail pembayaran">
        <dl className="space-y-3 text-sm">
          <div className="flex items-center justify-between gap-3">
            <dt className="text-muted">Invoice</dt>
            <dd className="font-medium text-ink">{current.id}</dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-muted">Nominal</dt>
            <dd className="font-display text-xl text-ink">{rupiah(current.amount)}</dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-muted">Status</dt>
            <dd>
              <StatusBadge status={current.status} />
            </dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-muted">Kedaluwarsa</dt>
            <dd className="text-ink">{dateTimeID(current.expiresAt)}</dd>
          </div>
        </dl>
        <div className="mt-5 flex flex-wrap gap-2">
          <Button onClick={refresh} loading={pending}>
            Cek Status
          </Button>
          <Button variant="secondary" onClick={() => window.print()}>
            Cetak Invoice
          </Button>
        </div>
        <p className="mt-3 text-xs text-muted">
          Pada MVP, konfirmasi pembayaran dilakukan admin setelah bukti transfer diverifikasi.
        </p>
      </Card>
    </div>
  );
}
