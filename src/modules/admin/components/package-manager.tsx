"use client";

import { useState } from "react";
import { rupiah } from "@/shared/lib/format";
import { Badge, Button, Card, Input, Table, Tbody, Td, Th, Thead, Tr, useToast } from "@/shared/ui";
import type { Package } from "@/shared/types";

export function PackageManager({ initial }: { initial: Package[] }) {
  const { toast } = useToast();
  const [items, setItems] = useState(initial);
  const [form, setForm] = useState({ name: "", price: "", quota: "" });

  function add() {
    const price = Number(form.price);
    const quota = Number(form.quota);
    if (!form.name || !price || !quota) return;
    setItems((current) => [
      ...current,
      { id: `pkg_${Date.now()}`, name: form.name, price, quota, active: true },
    ]);
    setForm({ name: "", price: "", quota: "" });
    toast({ title: "Paket ditambahkan" });
  }

  return (
    <div className="space-y-4">
      <Card title="Tambah paket">
        <div className="grid gap-3 sm:grid-cols-3">
          <Input
            label="Nama"
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
          />
          <Input
            label="Harga (IDR)"
            type="number"
            value={form.price}
            onChange={(event) => setForm({ ...form, price: event.target.value })}
          />
          <Input
            label="Kuota deploy"
            type="number"
            value={form.quota}
            onChange={(event) => setForm({ ...form, quota: event.target.value })}
          />
        </div>
        <div className="mt-4 flex justify-end">
          <Button onClick={add}>Tambah Paket</Button>
        </div>
      </Card>

      <Table>
        <Thead>
          <Tr>
            <Th>Paket</Th>
            <Th>Harga</Th>
            <Th>Kuota</Th>
            <Th>Status</Th>
            <Th>Aksi</Th>
          </Tr>
        </Thead>
        <Tbody>
          {items.map((item) => (
            <Tr key={item.id}>
              <Td>{item.name}</Td>
              <Td>{rupiah(item.price)}</Td>
              <Td>{item.quota}</Td>
              <Td>
                <Badge variant={item.active ? "success" : "neutral"}>
                  {item.active ? "Aktif" : "Nonaktif"}
                </Badge>
              </Td>
              <Td>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() =>
                    setItems((current) =>
                      current.map((entry) =>
                        entry.id === item.id ? { ...entry, active: !entry.active } : entry,
                      ),
                    )
                  }
                >
                  {item.active ? "Nonaktifkan" : "Aktifkan"}
                </Button>
              </Td>
            </Tr>
          ))}
        </Tbody>
      </Table>
    </div>
  );
}
