"use client";

import { useState } from "react";
import { dateTimeID, rupiah } from "@/shared/lib/format";
import { Button, Empty, StatusBadge, Table, Tbody, Td, Th, Thead, Tr, useToast } from "@/shared/ui";
import type { Payment } from "@/shared/types";

export function PaymentQueue({ initial }: { initial: Payment[] }) {
  const { toast } = useToast();
  const [items, setItems] = useState(initial);

  function confirm(id: string) {
    setItems((current) =>
      current.map((item) =>
        item.id === id ? { ...item, status: "CONFIRMED" } : item,
      ),
    );
    toast({ title: "Pembayaran dikonfirmasi", description: id });
  }

  if (!items.length) {
    return <Empty title="Tidak ada pembayaran" description="Antrian bersih." />;
  }

  return (
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
        {items.map((item) => (
          <Tr key={item.id}>
            <Td>{item.id}</Td>
            <Td>{item.projectId}</Td>
            <Td>{rupiah(item.amount)}</Td>
            <Td><StatusBadge status={item.status} /></Td>
            <Td>{dateTimeID(item.createdAt)}</Td>
            <Td>
              {item.status === "PENDING" ? (
                <Button size="sm" onClick={() => confirm(item.id)}>
                  Konfirmasi
                </Button>
              ) : (
                <span className="text-xs text-muted">—</span>
              )}
            </Td>
          </Tr>
        ))}
      </Tbody>
    </Table>
  );
}
