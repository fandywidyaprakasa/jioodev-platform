"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { api } from "@/shared/lib/api";
import { Button, Card, Input, Select, useToast } from "@/shared/ui";
import type { BusinessContext } from "@/shared/types";

const PURPOSES = [
  ["SAL", "Penjualan"],
  ["VIS", "Visibilitas"],
  ["LDG", "Lead generation"],
  ["ORD", "Order"],
  ["BOK", "Booking"],
  ["SSV", "Showcase layanan"],
];

const CHANNELS = ["WhatsApp", "Instagram", "Email", "Google Maps", "Marketplace"];

const INDUSTRIES = [
  { value: "FNB", label: "F&B" },
  { value: "RET", label: "Retail" },
  { value: "PRO", label: "Profesional" },
  { value: "BEA", label: "Beauty" },
  { value: "EVE", label: "Event" },
  { value: "REA", label: "Properti" },
  { value: "GEN", label: "Umum" },
];

export function BusinessIntakeForm({
  projectId,
  initial,
}: {
  projectId: string;
  initial: BusinessContext;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<BusinessContext>(initial);
  const [pending, startTransition] = useTransition();
  const storageKey = `jioodev:draft:${projectId}`;

  useEffect(() => {
    const draft = window.localStorage.getItem(storageKey);
    if (!draft) return;
    try {
      setForm(JSON.parse(draft) as BusinessContext);
    } catch {
      // abaikan draft korup
    }
  }, [storageKey]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      window.localStorage.setItem(storageKey, JSON.stringify(form));
    }, 400);
    return () => window.clearTimeout(timer);
  }, [form, storageKey]);

  const canContinue = useMemo(() => {
    if (step === 0) {
      return Boolean(form.businessName.trim() && form.industry && form.targetAudience.trim());
    }
    if (step === 1) return form.businessPurpose.length > 0;
    return Boolean(form.designPref.trim() && form.businessGoals.trim());
  }, [form, step]);

  function update<K extends keyof BusinessContext>(key: K, value: BusinessContext[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function toggleList(key: "businessPurpose" | "channels", value: string) {
    setForm((current) => {
      const list = current[key];
      return {
        ...current,
        [key]: list.includes(value)
          ? list.filter((item) => item !== value)
          : [...list, value],
      };
    });
  }

  function submit() {
    startTransition(async () => {
      try {
        await api.projects.saveContext(projectId, form);
        window.localStorage.removeItem(storageKey);
        toast({ title: "Business context tersimpan" });
        router.push(`/app/projects/${projectId}/comprehend`);
      } catch (error) {
        toast({
          title: "Gagal menyimpan",
          description: error instanceof Error ? error.message : "Coba lagi.",
          variant: "error",
        });
      }
    });
  }

  return (
    <Card
      title={`Langkah ${step + 1} dari 3`}
      description="Draf tersimpan otomatis di perangkat ini."
    >
      <div className="mb-5 flex gap-2">
        {[0, 1, 2].map((index) => (
          <span
            key={index}
            className={`h-1.5 flex-1 rounded-full ${
              index <= step ? "bg-accent" : "bg-line"
            }`}
          />
        ))}
      </div>

      {step === 0 ? (
        <div className="space-y-4">
          <Input
            label="Nama bisnis"
            name="businessName"
            value={form.businessName}
            onChange={(event) => update("businessName", event.target.value)}
            placeholder="Contoh: Kopi Pagi Hari"
          />
          <Select
            label="Industri"
            name="industry"
            value={form.industry}
            onChange={(event) => update("industry", event.target.value)}
            options={INDUSTRIES}
            placeholder="Pilih industri"
          />
          <Input
            label="Target audiens"
            name="targetAudience"
            value={form.targetAudience}
            onChange={(event) => update("targetAudience", event.target.value)}
            placeholder="Siapa yang ingin dijangkau?"
          />
        </div>
      ) : null}

      {step === 1 ? (
        <div className="space-y-5">
          <fieldset>
            <legend className="text-sm font-medium text-ink">Tujuan bisnis</legend>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {PURPOSES.map(([value, label]) => (
                <label
                  key={value}
                  className="flex items-center gap-2 rounded-md border border-line px-3 py-2 text-sm"
                >
                  <input
                    type="checkbox"
                    checked={form.businessPurpose.includes(value)}
                    onChange={() => toggleList("businessPurpose", value)}
                  />
                  {label}
                </label>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend className="text-sm font-medium text-ink">Kanal utama</legend>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {CHANNELS.map((channel) => (
                <label
                  key={channel}
                  className="flex items-center gap-2 rounded-md border border-line px-3 py-2 text-sm"
                >
                  <input
                    type="checkbox"
                    checked={form.channels.includes(channel)}
                    onChange={() => toggleList("channels", channel)}
                  />
                  {channel}
                </label>
              ))}
            </div>
          </fieldset>
        </div>
      ) : null}

      {step === 2 ? (
        <div className="space-y-4">
          <Input
            label="Preferensi desain"
            name="designPref"
            value={form.designPref}
            onChange={(event) => update("designPref", event.target.value)}
            placeholder="Contoh: hangat, editorial, tipografi tegas"
          />
          <div className="flex flex-col gap-1.5">
            <label htmlFor="businessGoals" className="text-sm font-medium text-ink">
              Tujuan utama
            </label>
            <textarea
              id="businessGoals"
              name="businessGoals"
              rows={4}
              value={form.businessGoals}
              onChange={(event) => update("businessGoals", event.target.value)}
              className="w-full rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink"
              placeholder="Apa hasil yang ingin dicapai dari website ini?"
            />
          </div>
        </div>
      ) : null}

      <div className="mt-6 flex items-center justify-between gap-3">
        <Button
          variant="ghost"
          onClick={() => setStep((current) => Math.max(0, current - 1))}
          disabled={step === 0}
        >
          Kembali
        </Button>
        {step < 2 ? (
          <Button onClick={() => setStep((current) => current + 1)} disabled={!canContinue}>
            Lanjut
          </Button>
        ) : (
          <Button onClick={submit} loading={pending} disabled={!canContinue}>
            Simpan & Lanjut
          </Button>
        )}
      </div>
    </Card>
  );
}
