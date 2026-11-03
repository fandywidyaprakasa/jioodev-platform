"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
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

type FieldErrors = Partial<Record<"businessName" | "industry" | "targetAudience" | "businessPurpose" | "channels" | "designPref" | "businessGoals", string>>;

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
  const [errors, setErrors] = useState<FieldErrors>({});
  const [syncError, setSyncError] = useState("");
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

  function validate(targetStep: number): FieldErrors {
    const next: FieldErrors = {};
    if (targetStep === 0) {
      if (form.businessName.trim().length < 2) {
        next.businessName = "Nama bisnis minimal 2 karakter.";
      }
      if (!form.industry) next.industry = "Pilih industri.";
      if (!form.targetAudience.trim()) {
        next.targetAudience = "Target audiens wajib diisi.";
      }
    }
    if (targetStep === 1) {
      if (!form.businessPurpose.length) {
        next.businessPurpose = "Pilih minimal satu tujuan bisnis.";
      }
      if (!form.channels.length) {
        next.channels = "Pilih minimal satu kanal utama.";
      }
    }
    if (targetStep === 2) {
      if (!form.designPref.trim()) {
        next.designPref = "Preferensi desain wajib diisi.";
      }
      if (!form.businessGoals.trim()) {
        next.businessGoals = "Tujuan utama wajib diisi.";
      }
    }
    return next;
  }

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

  function persist(moveNext: boolean) {
    const nextErrors = validate(step);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    startTransition(async () => {
      try {
        await api.projects.saveContext(projectId, form);
        setSyncError("");
        if (moveNext) {
          setErrors({});
          setStep((current) => current + 1);
          return;
        }
        window.localStorage.removeItem(storageKey);
        toast({ title: "Business context tersimpan" });
        router.push(`/app/projects/${projectId}/comprehend`);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Draf tersimpan di perangkat ini.";
        setSyncError(message);
        if (moveNext) {
          setErrors({});
          setStep((current) => current + 1);
        } else {
          toast({ title: "Gagal menyimpan", description: message, variant: "error" });
        }
      }
    });
  }

  return (
    <Card
      title={`Langkah ${step + 1} dari 3`}
      description="Draf tersimpan otomatis di perangkat ini dan disinkronkan saat lanjut."
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

      {syncError ? (
        <p role="status" className="mb-4 rounded-md border border-warning/30 bg-warning/10 p-3 text-xs text-warning">
          {syncError}
        </p>
      ) : null}

      {step === 0 ? (
        <div className="space-y-4">
          <Input
            label="Nama bisnis"
            name="businessName"
            value={form.businessName}
            onChange={(event) => update("businessName", event.target.value)}
            placeholder="Contoh: Kopi Pagi Hari"
            error={errors.businessName}
          />
          <Select
            label="Industri"
            name="industry"
            value={form.industry}
            onChange={(event) => update("industry", event.target.value)}
            options={INDUSTRIES}
            placeholder="Pilih industri"
            error={errors.industry}
          />
          <Input
            label="Target audiens"
            name="targetAudience"
            value={form.targetAudience}
            onChange={(event) => update("targetAudience", event.target.value)}
            placeholder="Siapa yang ingin dijangkau?"
            error={errors.targetAudience}
          />
        </div>
      ) : null}

      {step === 1 ? (
        <div className="space-y-5">
          <fieldset
            aria-invalid={errors.businessPurpose ? true : undefined}
            aria-describedby={errors.businessPurpose ? "purpose-error" : undefined}
          >
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
            {errors.businessPurpose ? (
              <p id="purpose-error" className="mt-2 text-xs text-danger">
                {errors.businessPurpose}
              </p>
            ) : null}
          </fieldset>
          <fieldset
            aria-invalid={errors.channels ? true : undefined}
            aria-describedby={errors.channels ? "channels-error" : undefined}
          >
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
            {errors.channels ? (
              <p id="channels-error" className="mt-2 text-xs text-danger">
                {errors.channels}
              </p>
            ) : null}
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
            error={errors.designPref}
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
              aria-invalid={errors.businessGoals ? true : undefined}
              aria-describedby={errors.businessGoals ? "businessGoals-error" : undefined}
              className={`w-full rounded-md border bg-surface px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent/15 ${
                errors.businessGoals
                  ? "border-danger focus:border-danger focus:ring-danger/15"
                  : "border-line focus:border-accent"
              }`}
              placeholder="Apa hasil yang ingin dicapai dari website ini?"
            />
            {errors.businessGoals ? (
              <p id="businessGoals-error" className="text-xs text-danger">
                {errors.businessGoals}
              </p>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="mt-6 flex items-center justify-between gap-3">
        <Button
          variant="ghost"
          onClick={() => {
            setErrors({});
            setStep((current) => Math.max(0, current - 1));
          }}
          disabled={step === 0 || pending}
        >
          Kembali
        </Button>
        {step < 2 ? (
          <Button onClick={() => persist(true)} loading={pending}>
            Lanjut
          </Button>
        ) : (
          <Button onClick={() => persist(false)} loading={pending}>
            Simpan & Lanjut
          </Button>
        )}
      </div>
    </Card>
  );
}
