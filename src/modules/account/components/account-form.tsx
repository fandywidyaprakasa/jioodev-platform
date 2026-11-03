"use client";

import { useState, useTransition } from "react";
import { api } from "@/shared/lib/api";
import { Button, Card, Input, useToast } from "@/shared/ui";

export interface AccountFormValues {
  name: string;
  email: string;
  phone: string;
  company: string;
}

export function AccountForm({ initial }: { initial?: Partial<AccountFormValues> }) {
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const [nameError, setNameError] = useState("");
  const [form, setForm] = useState<AccountFormValues>({
    name: initial?.name ?? "",
    email: initial?.email ?? "",
    phone: initial?.phone ?? "",
    company: initial?.company ?? "",
  });

  function update(key: keyof AccountFormValues, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function save() {
    if (form.name.trim().length < 2) {
      setNameError("Nama minimal 2 karakter.");
      return;
    }
    setNameError("");
    startTransition(async () => {
      try {
        await api.account.updateProfile({
          name: form.name,
          phone: form.phone,
          company: form.company,
        });
        toast({ title: "Profil tersimpan" });
      } catch (error) {
        toast({
          title: "Gagal menyimpan profil",
          description: error instanceof Error ? error.message : "Coba lagi.",
          variant: "error",
        });
      }
    });
  }

  return (
    <Card title="Profil" description="Data ini dipakai pada invoice dan komunikasi.">
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="Nama"
          name="name"
          value={form.name}
          error={nameError}
          onChange={(event) => update("name", event.target.value)}
        />
        <Input label="Email" type="email" value={form.email} disabled onChange={() => undefined} />
        <Input label="Telepon" value={form.phone} onChange={(event) => update("phone", event.target.value)} />
        <Input label="Perusahaan" value={form.company} onChange={(event) => update("company", event.target.value)} />
      </div>
      <div className="mt-4 flex justify-end">
        <Button onClick={save} loading={pending}>Simpan Profil</Button>
      </div>
    </Card>
  );
}
