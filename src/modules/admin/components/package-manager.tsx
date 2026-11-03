"use client";

import { useState, useTransition } from "react";
import { api } from "@/shared/lib/api";
import { rupiah } from "@/shared/lib/format";
import { Badge, Button, Card, Empty, Input, Modal, Table, Tbody, Td, Th, Thead, Tr, useToast } from "@/shared/ui";
import type { Package } from "@/shared/types";

export function PackageManager({ initial }: { initial: Package[] }) {
  const { toast } = useToast();
  const [items, setItems] = useState(initial);
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState({ name: "", price: "", deploy_included: "" });
  const [editing, setEditing] = useState<Package | null>(null);
  const [editForm, setEditForm] = useState({ name: "", price: "", deploy_included: "" });

  function add() {
    const price = Number(form.price);
    const deploy_included = Number(form.deploy_included);
    if (!form.name || !price || !deploy_included) return;
    startTransition(async () => {
      try {
        const created = await api.admin.createPackage({
          name: form.name,
          price,
          deploy_included,
        });
        setItems((current) => [...current, created]);
        setForm({ name: "", price: "", deploy_included: "" });
        toast({ title: "Paket ditambahkan" });
      } catch (error) {
        toast({
          title: "Gagal menambahkan paket",
          description: error instanceof Error ? error.message : "Coba lagi.",
          variant: "error",
        });
      }
    });
  }

  function toggle(item: Package) {
    startTransition(async () => {
      try {
        const updated = await api.admin.updatePackage(item.id, {
          active: !item.active,
        });
        setItems((current) =>
          current.map((entry) => (entry.id === item.id ? updated : entry)),
        );
      } catch (error) {
        toast({
          title: "Gagal memperbarui paket",
          description: error instanceof Error ? error.message : "Coba lagi.",
          variant: "error",
        });
      }
    });
  }

  function remove(item: Package) {
    startTransition(async () => {
      try {
        await api.admin.deletePackage(item.id);
        setItems((current) => current.filter((entry) => entry.id !== item.id));
        toast({ title: "Paket dihapus" });
      } catch (error) {
        toast({
          title: "Gagal menghapus paket",
          description: error instanceof Error ? error.message : "Coba lagi.",
          variant: "error",
        });
      }
    });
  }

  function edit(item: Package) {
    setEditing(item);
    setEditForm({
      name: item.name,
      price: String(item.price),
      deploy_included: String(item.deploy_included),
    });
  }

  function saveEdit() {
    if (!editing) return;
    const price = Number(editForm.price);
    const deploy_included = Number(editForm.deploy_included);
    if (!editForm.name || !price || !deploy_included) {
      toast({ title: "Lengkapi nama, harga, dan kuota deploy.", variant: "error" });
      return;
    }
    startTransition(async () => {
      try {
        const updated = await api.admin.updatePackage(editing.id, {
          name: editForm.name,
          price,
          deploy_included,
        });
        setItems((current) =>
          current.map((entry) => (entry.id === editing.id ? updated : entry)),
        );
        setEditing(null);
        toast({ title: "Paket diperbarui" });
      } catch (error) {
        toast({
          title: "Gagal memperbarui paket",
          description: error instanceof Error ? error.message : "Coba lagi.",
          variant: "error",
        });
      }
    });
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
            value={form.deploy_included}
            onChange={(event) => setForm({ ...form, deploy_included: event.target.value })}
          />
        </div>
        <div className="mt-4 flex justify-end">
          <Button onClick={add} loading={pending}>Tambah Paket</Button>
        </div>
      </Card>

      {items.length ? (
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
                <Td label="Paket">{item.name}</Td>
                <Td label="Harga">{rupiah(item.price)}</Td>
                <Td label="Kuota">{item.deploy_included}</Td>
                <Td label="Status">
                  <Badge variant={item.active ? "success" : "neutral"}>
                    {item.active ? "Aktif" : "Nonaktif"}
                  </Badge>
                </Td>
                <Td label="Aksi">
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="secondary" onClick={() => edit(item)}>
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => toggle(item)}
                      loading={pending}
                    >
                      {item.active ? "Nonaktifkan" : "Aktifkan"}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => remove(item)}>
                      Hapus
                    </Button>
                  </div>
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      ) : (
        <Empty
          title="Belum ada paket"
          description="Tambahkan paket pertama untuk mulai menampilkan harga."
        />
      )}

      <Modal
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title="Edit paket"
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditing(null)}>
              Batal
            </Button>
            <Button onClick={saveEdit} loading={pending}>
              Simpan
            </Button>
          </>
        }
      >
        <div className="grid gap-3">
          <Input
            label="Nama"
            value={editForm.name}
            onChange={(event) => setEditForm({ ...editForm, name: event.target.value })}
          />
          <Input
            label="Harga (IDR)"
            type="number"
            value={editForm.price}
            onChange={(event) => setEditForm({ ...editForm, price: event.target.value })}
          />
          <Input
            label="Kuota deploy"
            type="number"
            value={editForm.deploy_included}
            onChange={(event) => setEditForm({ ...editForm, deploy_included: event.target.value })}
          />
        </div>
      </Modal>
    </div>
  );
}
