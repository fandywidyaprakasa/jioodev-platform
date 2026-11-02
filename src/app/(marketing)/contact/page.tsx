"use client";

import { useState } from "react";
import { Button, Card, Input, PageHeader, useToast } from "@/shared/ui";

export default function ContactPage() {
  const { toast } = useToast();
  const [form, setForm] = useState({ name: "", email: "", message: "" });

  return (
    <div>
      <PageHeader
        eyebrow="Kontak"
        title="Hubungi Kami"
        description="Ceritakan kebutuhan bisnis Anda, kami bantu petakan solusinya."
      />
      <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <Card title="Kirim pesan">
          <div className="space-y-4">
            <Input
              label="Nama"
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
            />
            <Input
              label="Email"
              type="email"
              value={form.email}
              onChange={(event) => setForm({ ...form, email: event.target.value })}
            />
            <div className="flex flex-col gap-1.5">
              <label htmlFor="message" className="text-sm font-medium text-ink">
                Pesan
              </label>
              <textarea
                id="message"
                rows={5}
                value={form.message}
                onChange={(event) => setForm({ ...form, message: event.target.value })}
                className="w-full rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink"
              />
            </div>
            <div className="flex justify-end">
              <Button
                onClick={() => {
                  toast({
                    title: "Pesan terkirim",
                    description: "Tim JiooDev akan membalas lewat email.",
                  });
                  setForm({ name: "", email: "", message: "" });
                }}
                disabled={!form.name || !form.email || !form.message}
              >
                Kirim Pesan
              </Button>
            </div>
          </div>
        </Card>
        <Card title="Kontak langsung">
          <ul className="space-y-3 text-sm text-muted">
            <li>
              <span className="font-medium text-ink">WhatsApp</span>
              <br />
              +62 812-0000-0000
            </li>
            <li>
              <span className="font-medium text-ink">Email</span>
              <br />
              hello@jioo.site
            </li>
            <li>
              <span className="font-medium text-ink">Jam operasional</span>
              <br />
              Senin–Jumat, 09.00–17.00 WIB
            </li>
          </ul>
        </Card>
      </div>
    </div>
  );
}
