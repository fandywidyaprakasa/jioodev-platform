"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { api, type DeploymentState } from "@/shared/lib/api";
import { Badge, Button, Card, Input, useToast } from "@/shared/ui";
import type { DomainRecord } from "@/shared/types";

export function DeployPanel({ projectId }: { projectId: string }) {
  const { toast } = useToast();
  const CNAME_TARGET =
    process.env.NEXT_PUBLIC_DOMAIN_CNAME_TARGET ?? "cname.jioo.site";
  const [pending, startTransition] = useTransition();
  const [deployment, setDeployment] = useState<DeploymentState | null>(null);
  const [projectStatus, setProjectStatus] = useState("");
  const [domains, setDomains] = useState<DomainRecord[]>([]);
  const [domain, setDomain] = useState("");

  useEffect(() => {
    let active = true;
    Promise.all([
      api.projects.deployment(projectId),
      api.projects.domains(projectId),
    ])
      .then(([state, list]) => {
        if (!active) return;
        setDeployment(state.deployment);
        setProjectStatus(state.projectStatus);
        setDomains(list);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [projectId]);

  function reportDeployment(result: DeploymentState, verifiedTitle: string) {
    if (result.status === "LIVE" && result.health === "OK") {
      toast({
        title: verifiedTitle,
        description: result.liveUrl || "Route publik dan aset merespons normal.",
        variant: "success",
      });
      return;
    }
    if (result.status === "DEGRADED" || result.health === "FAIL") {
      toast({
        title: "Perlu perhatian",
        description:
          result.healthReason ??
          `Status ${result.status} · health ${result.health}.`,
        variant: "error",
      });
      return;
    }
    toast({
      title: "Menerbitkan…",
      description: `Status ${result.status} · health ${result.health}. Verifikasi menyusul.`,
    });
  }

  function deploy() {
    startTransition(async () => {
      try {
        const result = await api.projects.deploy(projectId);
        setDeployment(result);
        reportDeployment(result, "Situs live & terverifikasi");
      } catch (error) {
        toast({
          title: "Gagal memulai deploy",
          description: error instanceof Error ? error.message : "Coba lagi.",
          variant: "error",
        });
      }
    });
  }

  function republish() {
    startTransition(async () => {
      try {
        await api.projects.publish(projectId);
        const state = await api.projects.deployment(projectId);
        setProjectStatus(state.projectStatus);
        if (!state.deployment) {
          toast({
            title: "Perlu perhatian",
            description:
              "Publish selesai tetapi status deployment belum tersedia.",
            variant: "error",
          });
          return;
        }
        setDeployment(state.deployment);
        reportDeployment(state.deployment, "Situs diperbarui & terverifikasi");
      } catch (error) {
        toast({
          title: "Gagal memperbarui situs",
          description: error instanceof Error ? error.message : "Coba lagi.",
          variant: "error",
        });
      }
    });
  }

  function health() {
    startTransition(async () => {
      try {
        const result = await api.projects.deployHealth(projectId);
        setDeployment(result);
        reportDeployment(result, "Situs terverifikasi live");
      } catch (error) {
        toast({
          title: "Gagal memeriksa health",
          description: error instanceof Error ? error.message : "Coba lagi.",
          variant: "error",
        });
      }
    });
  }

  function addDomain() {
    if (!domain) return;
    startTransition(async () => {
      try {
        const created = await api.projects.addDomain(projectId, domain);
        setDomains((current) => [created, ...current]);
        setDomain("");
        toast({ title: "Domain ditambahkan", description: "Verifikasi DNS untuk melanjutkan." });
      } catch (error) {
        toast({
          title: "Gagal menambahkan domain",
          description: error instanceof Error ? error.message : "Coba lagi.",
          variant: "error",
        });
      }
    });
  }

  function verify(item: DomainRecord) {
    startTransition(async () => {
      try {
        const updated = await api.projects.verifyDomain(projectId, item.id);
        setDomains((current) =>
          current.map((entry) => (entry.id === item.id ? updated : entry)),
        );
        toast({
          title: updated.status === "ACTIVE" ? "Domain terverifikasi" : "DNS belum mengarah",
          description:
            updated.status === "ACTIVE"
              ? "SSL akan diprovision admin."
              : `Arahkan CNAME ke ${"cname.jioo.site"}.`,
          variant: updated.status === "ACTIVE" ? "success" : "error",
        });
      } catch (error) {
        toast({
          title: "Gagal memverifikasi domain",
          description: error instanceof Error ? error.message : "Coba lagi.",
          variant: "error",
        });
      }
    });
  }

  const verifiedLive =
    deployment?.status === "LIVE" && deployment?.health === "OK";
  const needsAttention =
    deployment?.status === "DEGRADED" || deployment?.health === "FAIL";
  const sitePublished =
    projectStatus === "ACTIVE" ||
    ["PROVISIONING", "LIVE", "DEGRADED"].includes(deployment?.status ?? "");
  const publicUrl = deployment?.liveUrl;

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card title="Halaman publik">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted">Status</span>
          <Badge
            variant={verifiedLive ? "success" : needsAttention ? "danger" : "warning"}
          >
            {needsAttention ? "Perlu perhatian" : deployment?.status ?? "PENDING"}
          </Badge>
        </div>
        <dl className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between gap-3">
            <dt className="text-muted">URL</dt>
            <dd className="text-ink">{deployment?.liveUrl || "Belum dipublish"}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-muted">Health</dt>
            <dd className="text-right text-ink">
              <span>{deployment?.health ?? "UNKNOWN"}</span>
              {needsAttention && deployment?.healthReason ? (
                <span className="mt-1 block text-xs text-danger">
                  {deployment.healthReason}
                </span>
              ) : null}
            </dd>
          </div>
        </dl>
        {deployment?.status === "PROVISIONING" ? (
          <p className="mt-3 text-xs text-muted">
            Menunggu verifikasi route publik dan aset. Status live hanya
            dilaporkan setelah probe berhasil.
          </p>
        ) : null}
        <div className="mt-4 flex gap-2">
          <Button onClick={sitePublished ? republish : deploy} loading={pending}>
            {sitePublished ? "Perbarui situs" : "Publish Halaman"}
          </Button>
          <Button variant="secondary" onClick={health} disabled={pending}>
            Health Check
          </Button>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
          <Link
            href={`/app/projects/${projectId}`}
            className="font-medium text-accent hover:underline"
          >
            Kembali ke Project
          </Link>
          {verifiedLive && publicUrl ? (
            <a
              href={publicUrl}
              target="_blank"
              rel="noreferrer"
              className="font-medium text-accent hover:underline"
            >
              Buka Halaman Publik
            </a>
          ) : null}
        </div>
      </Card>

      <Card
        title="Domain custom"
        description="Verifikasi kepemilikan dengan TXT, lalu arahkan CNAME ke cname.jioo.site."
      >
        <div className="flex flex-wrap items-end gap-2">
          <div className="min-w-[200px] flex-1">
            <Input
              label="Domain"
              placeholder="kopipagihari.com"
              value={domain}
              onChange={(event) => setDomain(event.target.value)}
            />
          </div>
          <Button variant="secondary" disabled={!domain || pending} onClick={addDomain}>
            Tambah
          </Button>
        </div>
        <ul className="mt-4 space-y-2">
          {domains.map((item) => (
            <li
              key={item.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-line px-3 py-2 text-sm"
            >
              <div className="min-w-0">
                <p className="font-medium text-ink">{item.domain}</p>
                <p className="text-xs text-muted">
                  {item.status} · SSL {item.sslStatus}
                </p>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => verify(item)}
                disabled={item.status === "ACTIVE"}
              >
                {item.status === "ACTIVE" ? "Terverifikasi" : "Verifikasi DNS"}
              </Button>
              {item.status !== "ACTIVE" ? (
                <div className="w-full rounded-md border border-dashed border-line bg-paper p-2 text-[11px] text-muted">
                  <p className="font-medium text-ink">Verifikasi kepemilikan</p>
                  <p className="mt-1 break-all">
                    TXT <code className="text-ink">{`_jioo.${item.domain}`}</code>{" "}
                    = <code className="text-ink">{`jioo-verify=${item.id}`}</code>
                  </p>
                  <p className="mt-1 break-all">
                    CNAME <code className="text-ink">{item.domain}</code> →{" "}
                    <code className="text-ink">{CNAME_TARGET}</code>
                  </p>
                </div>
              ) : null}
            </li>
          ))}
          {!domains.length ? (
            <li className="text-xs text-muted">Belum ada domain custom.</li>
          ) : null}
        </ul>
        <p className="mt-3 text-xs text-muted">
          Pada MVP, verifikasi dan SSL dilakukan semi-manual oleh admin.
        </p>
      </Card>
    </div>
  );
}
