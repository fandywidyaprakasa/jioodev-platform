"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { api } from "@/shared/lib/api";
import { Badge, Button, Card, Input, useToast } from "@/shared/ui";
import type { Deployment, DomainRecord } from "@/shared/types";

export function DeployPanel({ projectId }: { projectId: string }) {
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const [deployment, setDeployment] = useState<Deployment | null>(null);
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
        setDomains(list);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [projectId]);

  function deploy() {
    startTransition(async () => {
      try {
        const result = await api.projects.deploy(projectId);
        setDeployment(result);
        toast({
          title: "Deploy dimulai",
          description: `Status: ${result.status}.`,
        });
      } catch (error) {
        toast({
          title: "Gagal memulai deploy",
          description: error instanceof Error ? error.message : "Coba lagi.",
          variant: "error",
        });
      }
    });
  }

  function health() {
    startTransition(async () => {
      try {
        const state = await api.projects.deployment(projectId);
        setDeployment(state.deployment);
        toast({
          title: "Status deployment",
          description: state.deployment
            ? `${state.deployment.status} · health ${state.deployment.health}`
            : "Belum ada deployment.",
        });
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

  const live = deployment?.status === "LIVE";
  const subdomain = `${projectId.replace(/_/g, "-")}.jioo.site`;

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card title="Status deployment">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted">Status</span>
          <Badge variant={live ? "success" : "warning"}>
            {deployment?.status ?? "PENDING"}
          </Badge>
        </div>
        <dl className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between gap-3">
            <dt className="text-muted">URL</dt>
            <dd className="text-ink">{deployment?.liveUrl || subdomain}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-muted">Health</dt>
            <dd className="text-ink">{deployment?.health ?? "UNKNOWN"}</dd>
          </div>
        </dl>
        <div className="mt-4 flex gap-2">
          <Button onClick={deploy} loading={pending}>
            Deploy Sekarang
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
          {live ? (
            <Link
              href={`/app/projects/${projectId}/preview`}
              className="font-medium text-accent hover:underline"
            >
              Lihat Preview
            </Link>
          ) : null}
        </div>
      </Card>

      <Card title="Domain custom" description="Arahkan CNAME ke cname.jioo.site sebelum verifikasi.">
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
              <div>
                <p className="font-medium text-ink">{item.domain}</p>
                <p className="text-xs text-muted">
                  {item.status} · SSL {item.sslStatus}
                </p>
              </div>
              <Button size="sm" variant="ghost" onClick={() => verify(item)}>
                Verifikasi DNS
              </Button>
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
