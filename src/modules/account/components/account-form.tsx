"use client";

import { useState } from "react";
import { Button, Card, Input, useToast } from "@/shared/ui";

export function AccountForm() {
  const { toast } = useToast();
  const [form, setForm] = useState({
    name: "Fandy Widyaprakasa",
    email: "fandy@jioo.site",
    phone: "0812-0000-0000",
    company: "JiooDev",
  });

  function update(key: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  return (
    <Card title="Profil" description="Data ini dipakai pada invoice dan komunikasi.">
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Nama" value={form.name} onChange={(event) => update("name", event.target.value)} />
        <Input label="Email" type="email" value={form.email} onChange={(event) => update("email", event.target.value)} />
        <Input label="Telepon" value={form.phone} onChange={(event) => update("phone", event.target.value)} />
        <Input label="Perusahaan" value={form.company} onChange={(event) => update("company", event.target.value)} />
      </div>
      <div className="mt-4 flex justify-end">
        <Button onClick={() => toast({ title: "Profil tersimpan" })}>Simpan Profil</Button>
      </div>
    </Card>
  );
}
