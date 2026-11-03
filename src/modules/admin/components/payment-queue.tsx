"use client";

import { useMemo, useState, useTransition } from "react";
import { api } from "@/shared/lib/api";
import { dateTimeID, rupiah } from "@/shared/lib/format";
import { Button, Empty, Input, Select, StatusBadge, Table, Tbody, Td, Th, Thead, Tr, useToast } from "@/shared/ui";
import type { Payment } from "@/shared/types";

export function PaymentQueue({ initial }: { initial: Payment[] }) {
  const { toast } = useToast();
  const [items, setItems] = useState(initial);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [, startTransition] = useTransition();

  function refund(id: string) {
    setPendingId(id);
    startTransition(async () => {
      try {
        const result = await api.admin.refundPayment(id);
        setItems((current) =>
          current.map((item) => (item.id === id ? result.payment : item)),
        );
        toast({ title: "Pembayaran direfund", description: id });
      } catch (error) {
        toast({
          title: "Refund gagal",
          description: error instanceof Error ? error.message : "Coba lagi.",
          variant: "error",
        });
      } finally {
        setPendingId(null);
      }
    });
  }

  function confirm(id: string) {
    setPendingId(id);
    startTransition(async () => {
      try {
        const result = await api.admin.confirmPayment(id);
        setItems((current) =>
          current.map((item) => (item.id === id ? result.payment : item)),
        );
        toast({ title: "Pembayaran dikonfirmasi", description: id });
      } catch (error) {
        toast({
          title: "Gagal mengonfirmasi",
          description: error instanceof Error ? error.message : "Coba lagi.",
          variant: "error",
        });
      } finally {
        setPendingId(null);
      }
    });
  }

  const filtered = useMemo(
    () =>
      items.filter((item) => {
        const haystack = `${item.invoiceNo ?? ""} ${item.id} ${item.projectId}`.toLowerCase();
        return (
          (status === "all" || item.status === status) &&
          haystack.includes(query.trim().toLowerCase())
        );
      }),
    [items, query, status],
  );

  if (!items.length) {
    return <Empty title="Tidak ada pembayaran" description="Antrian bersih." />;
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-[1.5fr_1fr]">
        <Input
          label="Cari pembayaran"
          placeholder="Invoice, ID, atau project"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <Select
          label="Status"
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          options={[
            { value: "all", label: "Semua status" },
            { value: "PENDING", label: "Menunggu" },
            { value: "CONFIRMED", label: "Terkonfirmasi" },
            { value: "REFUNDED", label: "Refund" },
            { value: "FAILED", label: "Gagal" },
          ]}
        />
      </div>
      {filtered.length ? (
        <Table>
      <Thead>
        <Tr>
          <Th>Invoice</Th>
          <Th>Project</Th>
          <Th>Nominal</Th>
          <Th>Status</Th>
          <Th>Dibuat</Th>
          <Th>Aksi</Th>
        </Tr>
      </Thead>
      <Tbody>
        {filtered.map((item) => (
          <Tr key={item.id}>
            <Td label="Invoice">{item.invoiceNo ?? item.id}</Td>
            <Td label="Project">{item.projectId}</Td>
            <Td label="Nominal">{rupiah(item.amount)}</Td>
            <Td label="Status"><StatusBadge status={item.status} /></Td>
            <Td label="Dibuat">{dateTimeID(item.createdAt)}</Td>
            <Td label="Aksi">
              {item.status === "PENDING" ? (
                <Button
                  size="sm"
                  onClick={() => confirm(item.id)}
                  loading={pendingId === item.id}
                >
                  Konfirmasi
                </Button>
              ) : item.status === "CONFIRMED" ? (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => refund(item.id)}
                  loading={pendingId === item.id}
                >
                  Refund
                </Button>
              ) : (
                <span className="text-xs text-muted">—</span>
              )}
            </Td>
          </Tr>
        ))}
      </Tbody>
        </Table>
      ) : (
        <Empty
          title="Tidak ada pembayaran dengan filter ini"
          description="Ubah kata kunci atau status."
        />
      )}
    </div>
  );
}
