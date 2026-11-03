"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { api } from "@/shared/lib/api";
import { rupiah } from "@/shared/lib/format";
import { Button, Card, useToast } from "@/shared/ui";
import type { Package } from "@/shared/types";

export function PaymentStarter({
  projectId,
  packages,
}: {
  projectId: string;
  packages: Package[];
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [selected, setSelected] = useState(packages[0]?.id ?? "");
  const [pending, startTransition] = useTransition();

  function start() {
    startTransition(async () => {
      try {
        await api.payments.create(projectId, selected || undefined);
        toast({ title: "Pembayaran dibuat", description: "Invoice siap dibayar." });
        router.refresh();
      } catch (error) {
        toast({
          title: "Gagal membuat pembayaran",
          description: error instanceof Error ? error.message : "Coba lagi.",
          variant: "error",
        });
      }
    });
  }

  return (
    <Card
      title="Pilih paket"
      description="Pilih paket sebelum membuat invoice. Harga dihitung di server."
    >
      {packages.length ? (
        <fieldset>
          <legend className="sr-only">Paket pembayaran</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            {packages.map((item) => {
              const active = selected === item.id;
              return (
                <label
                  key={item.id}
                  className={`flex cursor-pointer flex-col gap-1 rounded-lg border p-4 text-left transition-colors duration-150 ${
                    active
                      ? "border-accent bg-accent-soft"
                      : "border-line bg-surface hover:border-ink/30"
                  }`}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-ink">{item.name}</span>
                    <input
                      type="radio"
                      name="package"
                      value={item.id}
                      checked={active}
                      onChange={() => setSelected(item.id)}
                    />
                  </span>
                  <span className="font-display text-2xl text-ink">
                    {rupiah(item.price)}
                  </span>
                  <span className="text-xs text-muted">{item.deploy_included} deploy</span>
                </label>
              );
            })}
          </div>
        </fieldset>
      ) : (
        <p className="rounded-md border border-dashed border-line bg-paper p-4 text-sm text-muted">
          Paket belum tersedia. Invoice akan memakai harga default sesuai tipe project.
        </p>
      )}

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs leading-relaxed text-muted">
          Nominal final ditentukan server berdasarkan paket yang dipilih.
        </p>
        <Button onClick={start} loading={pending}>
          Buat Pembayaran
        </Button>
      </div>
    </Card>
  );
}
