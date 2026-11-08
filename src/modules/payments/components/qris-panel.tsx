"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import QRCode from "qrcode";
import { rupiah, dateTimeID } from "@/shared/lib/format";
import { api } from "@/shared/lib/api";
import { Button, Card, StatusBadge, useToast } from "@/shared/ui";
import type { Payment } from "@/shared/types";

export function QrisPanel({ payment }: { payment: Payment }) {
  const { toast } = useToast();
  const [current, setCurrent] = useState(payment);
  const [qrImage, setQrImage] = useState("");
  const [pending, startTransition] = useTransition();
  const manual = current.qrString.startsWith("JIOODEV-MANUAL");

  useEffect(() => {
    if (!current.qrString || manual) return;
    let active = true;
    QRCode.toDataURL(current.qrString, {
      width: 320,
      margin: 1,
      errorCorrectionLevel: "M",
    })
      .then((url) => {
        if (active) setQrImage(url);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [current.qrString, manual]);

  function refresh() {
    if (manual) {
      toast({
        title: "Menunggu verifikasi admin",
        description: "Pembayaran manual dikonfirmasi setelah bukti transfer diperiksa.",
      });
      return;
    }
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
      <Card
        title={manual ? "Pembayaran manual" : "QRIS"}
        description={
          manual
            ? "Transfer sesuai nominal, lalu admin memverifikasi."
            : "Pindai dengan aplikasi pembayaran."
        }
      >
        {manual ? (
          <div className="flex aspect-square max-w-[260px] flex-col items-center justify-center gap-2 rounded-md border border-dashed border-line bg-paper p-4 text-center">
            <span className="font-display text-2xl text-ink tabular-nums">
              {rupiah(current.amount)}
            </span>
            <span className="text-xs text-muted">
              Sebutkan kode referensi saat konfirmasi.
            </span>
            <span className="break-all text-xs font-medium text-ink">
              {current.qrString.split("|")[1] ?? current.id}
            </span>
          </div>
        ) : (
          <div className="mx-auto flex aspect-square max-w-[260px] items-center justify-center rounded-md border border-line bg-white p-3">
            {qrImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={qrImage} alt="QRIS pembayaran" className="h-full w-full" />
            ) : (
              <span className="text-xs text-muted">Menyiapkan QR…</span>
            )}
          </div>
        )}
      </Card>
      <Card title="Detail pembayaran">
        <dl className="space-y-3 text-sm">
          <div className="flex items-center justify-between gap-3">
            <dt className="text-muted">Invoice</dt>
            <dd className="font-medium text-ink">
              {current.invoiceNo ?? current.id}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-muted">Nominal</dt>
            <dd className="font-display text-xl text-ink tabular-nums">{rupiah(current.amount)}</dd>
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
        <div className="mt-5 flex flex-wrap items-center gap-2">
          <Button onClick={refresh} loading={pending}>
            Cek Status
          </Button>
          <Button variant="secondary" onClick={() => window.print()}>
            Cetak Invoice
          </Button>
          {current.status === "CONFIRMED" ? (
            <Link
              href={`/app/projects/${current.projectId}/deploy`}
              className="inline-flex items-center rounded-full bg-accent px-4 py-2 text-sm font-medium text-on-accent transition-[background-color,border-color,color,transform] duration-150 active:scale-[0.96] hover:bg-accent-strong"
            >
              Lanjut ke Deploy
            </Link>
          ) : current.status === "FAILED" || current.status === "REFUNDED" ? (
            <Button variant="secondary" onClick={() => window.location.reload()}>
              Buat Pembayaran Baru
            </Button>
          ) : null}
        </div>
        <p className="mt-3 text-xs text-muted">
          Pada MVP, konfirmasi pembayaran dilakukan admin setelah bukti transfer diverifikasi.
        </p>
        <Link
          href={`/app/projects/${current.projectId}`}
          className="mt-4 inline-block text-xs font-medium text-accent hover:underline"
        >
          Kembali ke Project
        </Link>
      </Card>
    </div>
  );
}
