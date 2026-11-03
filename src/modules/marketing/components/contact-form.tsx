"use client";

import { useState, useTransition } from "react";
import { Button, Input, useToast } from "@/shared/ui";

interface ContactFormValues {
  name: string;
  email: string;
  message: string;
}

interface ContactErrors {
  name?: string;
  email?: string;
  message?: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function ContactForm() {
  const { toast } = useToast();
  const [form, setForm] = useState<ContactFormValues>({
    name: "",
    email: "",
    message: "",
  });
  const [errors, setErrors] = useState<ContactErrors>({});
  const [pending, startTransition] = useTransition();

  function validate(values: ContactFormValues): ContactErrors {
    const next: ContactErrors = {};
    if (values.name.trim().length < 2) {
      next.name = "Nama minimal 2 karakter.";
    }
    if (!EMAIL_RE.test(values.email.trim())) {
      next.email = "Masukkan alamat email yang valid.";
    }
    if (values.message.trim().length < 10) {
      next.message = "Pesan minimal 10 karakter.";
    }
    return next;
  }

  function submit() {
    const nextErrors = validate(form);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    startTransition(async () => {
      try {
        const response = await fetch("/api/contact", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        if (!response.ok) throw new Error("Gagal mengirim pesan.");
        toast({
          title: "Pesan terkirim",
          description: "Tim JiooDev akan membalas lewat email.",
        });
        setForm({ name: "", email: "", message: "" });
      } catch (error) {
        toast({
          title: "Pesan gagal dikirim",
          description: error instanceof Error ? error.message : "Coba lagi.",
          variant: "error",
        });
      }
    });
  }

  return (
    <form
      noValidate
      className="rounded-lg border border-line bg-surface p-5 shadow-sm sm:p-7"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <div className="grid gap-5">
        <Input
          label="Nama"
          name="name"
          autoComplete="name"
          value={form.name}
          error={errors.name}
          onChange={(event) => setForm({ ...form, name: event.target.value })}
        />
        <Input
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          value={form.email}
          error={errors.email}
          onChange={(event) => setForm({ ...form, email: event.target.value })}
        />
        <div className="flex flex-col gap-1.5">
          <label htmlFor="message" className="text-sm font-medium text-ink">
            Pesan
          </label>
          <textarea
            id="message"
            name="message"
            rows={6}
            value={form.message}
            onChange={(event) => setForm({ ...form, message: event.target.value })}
            aria-invalid={errors.message ? true : undefined}
            aria-describedby={errors.message ? "message-error" : undefined}
            placeholder="Ceritakan bisnis, tujuan, dan tenggat yang Anda hadapi."
            className={`w-full rounded-md border bg-surface px-3 py-2.5 text-sm leading-relaxed text-ink transition-colors duration-150 placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/15 ${
              errors.message
                ? "border-danger focus:border-danger focus:ring-danger/15"
                : "border-line focus:border-accent"
            }`}
          />
          {errors.message ? (
            <p id="message-error" className="text-xs text-danger">
              {errors.message}
            </p>
          ) : null}
        </div>
      </div>
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs leading-relaxed text-muted">
          Kami balas pada hari kerja, biasanya dalam 1×24 jam.
        </p>
        <Button type="submit" loading={pending}>
          Kirim pesan
        </Button>
      </div>
    </form>
  );
}
