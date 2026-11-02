"use client";

import { useState } from "react";
import { Badge, Button, Card, Input, useToast } from "@/shared/ui";

export function DeployPanel({ projectId }: { projectId: string }) {
  const { toast } = useToast();
  const [domain, setDomain] = useState("");
  const [status, setStatus] = useState<"PENDING" | "PROVISIONING" | "LIVE">("PENDING");

  function deploy() {
    setStatus("PROVISIONING");
    window.setTimeout(() => {
      setStatus("LIVE");
      toast({ title: "Deploy live", description: `Project ${projectId} aktif.` });
    }, 900);
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card title="Status deployment">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted">Status</span>
          <Badge variant={status === "LIVE" ? "success" : "warning"}>{status}</Badge>
        </div>
        <dl className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between gap-3">
            <dt className="text-muted">Subdomain</dt>
            <dd className="text-ink">{projectId.replace(/_/g, "-")}.jioo.site</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-muted">Health</dt>
            <dd className="text-ink">{status === "LIVE" ? "OK" : "Menunggu"}</dd>
          </div>
        </dl>
        <div className="mt-4 flex gap-2">
          <Button onClick={deploy} loading={status === "PROVISIONING"}>
            Deploy Sekarang
          </Button>
          <Button
            variant="secondary"
            onClick={() => toast({ title: "Health check", description: "Endpoint health merespons 200." })}
          >
            Health Check
          </Button>
        </div>
      </Card>

      <Card title="Domain custom" description="Arahkan DNS ke platform sebelum verifikasi.">
        <Input
          label="Domain"
          placeholder="kopipagihari.com"
          value={domain}
          onChange={(event) => setDomain(event.target.value)}
        />
        <div className="mt-4 flex gap-2">
          <Button
            variant="secondary"
            disabled={!domain}
            onClick={() =>
              toast({
                title: "Verifikasi dimulai",
                description: `Cek DNS untuk ${domain}.`,
              })
            }
          >
            Verifikasi DNS
          </Button>
        </div>
        <p className="mt-3 text-xs text-muted">
          Pada MVP, verifikasi dan SSL dilakukan semi-manual oleh admin.
        </p>
      </Card>
    </div>
  );
}
