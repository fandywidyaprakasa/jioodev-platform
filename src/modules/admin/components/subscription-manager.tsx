"use client";

import { useMemo, useState, useTransition } from "react";
import { api } from "@/shared/lib/api";
import { dateTimeID, rupiah } from "@/shared/lib/format";
import {
  Badge,
  Button,
  Card,
  Empty,
  Input,
  Modal,
  Select,
  StatusBadge,
  Table,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
  useToast,
} from "@/shared/ui";
import type { Package, UserWithSubscription } from "@/shared/types";

interface Props {
  initial: UserWithSubscription[];
}

export function SubscriptionManager({ initial }: Props) {
  const { toast } = useToast();
  const [items, setItems] = useState(initial);
  const [pending, startTransition] = useTransition();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [packages, setPackages] = useState<Package[]>([]);
  const [editing, setEditing] = useState<UserWithSubscription | null>(null);
  const [granting, setGranting] = useState<UserWithSubscription | null>(null);
  const [form, setForm] = useState({
    package_id: "",
    period_end: "",
    quota_landing_total: "",
    quota_web_total: "",
    lifetime: false,
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  async function loadPackages() {
    try {
      const data = await api.admin.packages();
      setPackages(data);
    } catch {
      setPackages([]);
    }
  }

  function validateForm() {
    const errors: Record<string, string> = {};
    if (!form.package_id) errors.package_id = "Paket wajib dipilih.";
    if (!form.lifetime && !form.period_end) errors.period_end = "Tanggal kedaluwarsa wajib diisi atau pilih Lifetime.";
    if (form.quota_landing_total && Number(form.quota_landing_total) < 0) {
      errors.quota_landing_total = "Kuota landing tidak boleh negatif.";
    }
    if (form.quota_web_total && Number(form.quota_web_total) < 0) {
      errors.quota_web_total = "Kuota web tidak boleh negatif.";
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }

  function submitGrant() {
    if (!granting || !validateForm()) return;
    const userId = granting.id;
    startTransition(async () => {
      try {
        const periodEnd = form.lifetime ? null : form.period_end;
        const quotaLanding = form.quota_landing_total ? Number(form.quota_landing_total) : undefined;
        const quotaWeb = form.quota_web_total ? Number(form.quota_web_total) : undefined;
        const result = await api.admin.grantSubscription({
          userId,
          packageId: form.package_id,
          periodEnd,
          quotaLanding,
          quotaWeb,
        });
        await refresh();
        setGranting(null);
        resetForm();
        toast({ title: "Langganan diberikan", description: result.id });
      } catch (error) {
        toast({
          title: "Gagal memberi langganan",
          description: error instanceof Error ? error.message : "Coba lagi.",
          variant: "error",
        });
      }
    });
  }

  function submitEdit() {
    if (!editing?.subscription || !validateForm()) return;
    const subId = editing.subscription.id;
    startTransition(async () => {
      try {
        const periodEnd = form.lifetime ? null : form.period_end;
        const quotaLanding = form.quota_landing_total ? Number(form.quota_landing_total) : undefined;
        const quotaWeb = form.quota_web_total ? Number(form.quota_web_total) : undefined;
        await api.admin.updateSubscription(subId, {
          package_id: form.package_id,
          period_end: periodEnd,
          quota_landing_total: quotaLanding,
          quota_web_total: quotaWeb,
        });
        await refresh();
        setEditing(null);
        resetForm();
        toast({ title: "Langganan diperbarui" });
      } catch (error) {
        toast({
          title: "Gagal memperbarui langganan",
          description: error instanceof Error ? error.message : "Coba lagi.",
          variant: "error",
        });
      }
    });
  }

  function revoke(subId: string) {
    if (!confirm("Yakin ingin mencabut langganan ini?")) return;
    startTransition(async () => {
      try {
        await api.admin.revokeSubscription(subId);
        await refresh();
        toast({ title: "Langganan dicabut" });
      } catch (error) {
        toast({
          title: "Gagal mencabut langganan",
          description: error instanceof Error ? error.message : "Coba lagi.",
          variant: "error",
        });
      }
    });
  }

  async function refresh() {
    try {
      const data = await api.admin.listUsersWithSubscriptions?.() ?? [];
      setItems(data);
    } catch {
      // ignore
    }
  }

  function openGrant(user: UserWithSubscription) {
    setGranting(user);
    setEditing(null);
    const pkg = packages.find((p) => p.id === user.subscription?.package_id);
    setForm({
      package_id: user.subscription?.package_id ?? "",
      period_end: user.subscription?.period_end ?? "",
      quota_landing_total: String(pkg?.deploy_included ?? 1),
      quota_web_total: "0",
      lifetime: !user.subscription?.period_end,
    });
    setFormErrors({});
  }

  function openEdit(user: UserWithSubscription) {
    setEditing(user);
    setGranting(null);
    const pkg = packages.find((p) => p.id === user.subscription?.package_id);
    setForm({
      package_id: user.subscription?.package_id ?? "",
      period_end: user.subscription?.period_end ?? "",
      quota_landing_total: String(user.subscription?.quota_landing_total ?? pkg?.deploy_included ?? 1),
      quota_web_total: String(user.subscription?.quota_web_total ?? 0),
      lifetime: !user.subscription?.period_end,
    });
    setFormErrors({});
  }

  function resetForm() {
    setForm({
      package_id: "",
      period_end: "",
      quota_landing_total: "",
      quota_web_total: "",
      lifetime: false,
    });
    setFormErrors({});
  }

  const packageOptions = useMemo(
    () =>
      packages.map((p) => ({
        value: p.id,
        label: `${p.name} (${p.tier}, ${p.billing_type})`,
      })),
    [packages],
  );

  const filtered = useMemo(
    () =>
      items.filter((item) => {
        const haystack = `${item.email} ${item.name} ${item.subscription?.package_name ?? ""}`.toLowerCase();
        const status = item.subscription?.status ?? "NONE";
        return (
          (statusFilter === "all" || status === statusFilter) &&
          haystack.includes(query.trim().toLowerCase())
        );
      }),
    [items, query, statusFilter],
  );

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Input
          label="Cari pengguna"
          placeholder="Email, nama, atau paket"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <Select
          label="Status"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          options={[
            { value: "all", label: "Semua status" },
            { value: "ACTIVE", label: "Aktif" },
            { value: "EXPIRED", label: "Kedaluwarsa" },
            { value: "EXHAUSTED", label: "Habis" },
            { value: "NONE", label: "Tanpa langganan" },
          ]}
        />
      </div>

      {filtered.length ? (
        <Table>
          <Thead>
            <Tr>
              <Th>Pengguna</Th>
              <Th>Paket</Th>
              <Th>Status</Th>
              <Th>Kuota Landing</Th>
              <Th>Kuota Web</Th>
              <Th>Periode Berakhir</Th>
              <Th>Aksi</Th>
            </Tr>
          </Thead>
          <Tbody>
            {filtered.map((item) => (
              <Tr key={item.id}>
                <Td label="Pengguna">
                  <div>
                    <p className="font-medium">{item.email}</p>
                    {item.name && <p className="text-xs text-muted">{item.name}</p>}
                  </div>
                </Td>
                <Td label="Paket">{item.subscription?.package_name ?? "—"}</Td>
                <Td label="Status">
                  {item.subscription ? (
                    <StatusBadge status={item.subscription.status} />
                  ) : (
                    <Badge variant="neutral">Tidak ada</Badge>
                  )}
                </Td>
                <Td label="Kuota Landing">
                  {item.subscription
                    ? `${item.subscription.quota_landing_used} / ${item.subscription.quota_landing_total}`
                    : "—"}
                </Td>
                <Td label="Kuota Web">
                  {item.subscription
                    ? `${item.subscription.quota_web_used} / ${item.subscription.quota_web_total}`
                    : "—"}
                </Td>
                <Td label="Periode Berakhir">
                  {item.subscription?.period_end ? dateTimeID(item.subscription.period_end) : "LIFETIME"}
                </Td>
                <Td label="Aksi">
                  <div className="flex flex-wrap gap-2">
                    {item.subscription ? (
                      <>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => openEdit(item)}
                        >
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => revoke(item.subscription!.id)}
                        >
                          Cabut
                        </Button>
                      </>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => openGrant(item)}
                      >
                        Beri Langganan
                      </Button>
                    )}
                  </div>
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      ) : (
        <Empty
          title="Tidak ada pengguna dengan filter ini"
          description="Ubah kata kunci atau status."
        />
      )}

      <Modal
        open={Boolean(granting)}
        onClose={() => setGranting(null)}
        title="Beri Langganan"
        footer={
          <>
            <Button variant="secondary" onClick={() => setGranting(null)}>
              Batal
            </Button>
            <Button onClick={submitGrant} loading={pending}>
              Simpan
            </Button>
          </>
        }
      >
        <div className="grid gap-3">
          <Select
            label="Paket"
            value={form.package_id}
            onChange={(e) => setForm({ ...form, package_id: e.target.value })}
            options={packageOptions}
            placeholder="Pilih paket"
            error={formErrors.package_id}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-ink">Periode Berakhir</label>
              <div className="flex items-center gap-2">
                <Input
                  type="date"
                  value={form.period_end}
                  onChange={(e) => setForm({ ...form, period_end: e.target.value, lifetime: false })}
                  disabled={form.lifetime}
                  className={form.lifetime ? "opacity-60" : ""}
                  error={formErrors.period_end}
                />
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.lifetime}
                    onChange={(e) => setForm({ ...form, lifetime: e.target.checked })}
                    className="h-4 w-4 rounded border-line text-accent focus:ring-accent/20"
                  />
                  <span className="text-sm text-ink">Lifetime (tanpa kedaluwarsa)</span>
                </label>
              </div>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              label="Kuota Landing Total"
              type="number"
              value={form.quota_landing_total}
              onChange={(e) => setForm({ ...form, quota_landing_total: e.target.value })}
              error={formErrors.quota_landing_total}
              min="0"
            />
            <Input
              label="Kuota Web Total"
              type="number"
              value={form.quota_web_total}
              onChange={(e) => setForm({ ...form, quota_web_total: e.target.value })}
              error={formErrors.quota_web_total}
              min="0"
            />
          </div>
        </div>
      </Modal>

      <Modal
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title="Edit Langganan"
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditing(null)}>
              Batal
            </Button>
            <Button onClick={submitEdit} loading={pending}>
              Simpan
            </Button>
          </>
        }
      >
        <div className="grid gap-3">
          <Select
            label="Paket"
            value={form.package_id}
            onChange={(e) => setForm({ ...form, package_id: e.target.value })}
            options={packageOptions}
            placeholder="Pilih paket"
            error={formErrors.package_id}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-ink">Periode Berakhir</label>
              <div className="flex items-center gap-2">
                <Input
                  type="date"
                  value={form.period_end}
                  onChange={(e) => setForm({ ...form, period_end: e.target.value, lifetime: false })}
                  disabled={form.lifetime}
                  className={form.lifetime ? "opacity-60" : ""}
                  error={formErrors.period_end}
                />
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.lifetime}
                    onChange={(e) => setForm({ ...form, lifetime: e.target.checked })}
                    className="h-4 w-4 rounded border-line text-accent focus:ring-accent/20"
                  />
                  <span className="text-sm text-ink">Lifetime (tanpa kedaluwarsa)</span>
                </label>
              </div>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              label="Kuota Landing Total"
              type="number"
              value={form.quota_landing_total}
              onChange={(e) => setForm({ ...form, quota_landing_total: e.target.value })}
              error={formErrors.quota_landing_total}
              min="0"
            />
            <Input
              label="Kuota Web Total"
              type="number"
              value={form.quota_web_total}
              onChange={(e) => setForm({ ...form, quota_web_total: e.target.value })}
              error={formErrors.quota_web_total}
              min="0"
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}