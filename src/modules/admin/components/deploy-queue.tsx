"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { api } from "@/shared/lib/api";
import { Button, Empty, StatusBadge, Table, Tbody, Td, Th, Thead, Tr, useToast } from "@/shared/ui";
import type { Deployment } from "@/shared/types";

export function DeployQueue({ initial }: { initial: Deployment[] }) {
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const [rows, setRows] = useState(initial);

  function update(row: Deployment) {
    setRows((current) =>
      current.map((item) => (item.id === row.id ? row : item)),
    );
  }

  function health(row: Deployment) {
    startTransition(async () => {
      try {
        const result = await api.admin.deployHealth(row.projectId);
        update(result);
        toast({ title: "Health check", description: `${result.health} · ${result.status}` });
      } catch (error) {
        toast({
          title: "Health check gagal",
          description: error instanceof Error ? error.message : "Coba lagi.",
          variant: "error",
        });
      }
    });
  }

  function deploy(row: Deployment) {
    startTransition(async () => {
      try {
        const result = await api.admin.deployProject(row.projectId);
        update(result);
        toast({ title: "Deploy dijalankan", description: `Status: ${result.status}.` });
      } catch (error) {
        toast({
          title: "Deploy gagal",
          description: error instanceof Error ? error.message : "Coba lagi.",
          variant: "error",
        });
      }
    });
  }

  function rollback(row: Deployment) {
    startTransition(async () => {
      try {
        const result = await api.admin.rollbackDeployment(row.projectId);
        update(result);
        toast({ title: "Rollback selesai", description: `Status: ${result.status}.` });
      } catch (error) {
        toast({
          title: "Rollback gagal",
          description: error instanceof Error ? error.message : "Coba lagi.",
          variant: "error",
        });
      }
    });
  }

  if (!rows.length) {
    return (
      <Empty
        title="Belum ada deployment"
        description="Deployment muncul setelah project dibayar dan di-deploy."
      />
    );
  }

  return (
    <Table>
      <Thead>
        <Tr>
          <Th>Project</Th>
          <Th>Domain</Th>
          <Th>Status</Th>
          <Th>Aksi</Th>
        </Tr>
      </Thead>
      <Tbody>
        {rows.map((row) => (
          <Tr key={row.id}>
            <Td label="Project">
              <Link href={`/admin/projects/${row.projectId}`} className="font-medium text-ink hover:text-accent">
                {row.projectId}
              </Link>
            </Td>
            <Td label="Domain">{row.liveUrl}</Td>
            <Td label="Status"><StatusBadge status={row.status} /></Td>
            <Td label="Aksi">
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" onClick={() => health(row)} loading={pending}>
                  Health
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => deploy(row)}
                  disabled={pending || row.status === "LIVE"}
                >
                  Deploy
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => rollback(row)}
                  disabled={pending || !["LIVE", "DEGRADED"].includes(row.status)}
                >
                  Rollback
                </Button>
              </div>
            </Td>
          </Tr>
        ))}
      </Tbody>
    </Table>
  );
}
