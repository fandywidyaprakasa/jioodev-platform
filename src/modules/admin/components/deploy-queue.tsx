"use client";

import Link from "next/link";
import { useState } from "react";
import { Button, StatusBadge, Table, Tbody, Td, Th, Thead, Tr, useToast } from "@/shared/ui";

interface DeployRow {
  id: string;
  project: string;
  domain: string;
  status: string;
}

const ROWS: DeployRow[] = [
  { id: "dep_1", project: "proj_kopi_pagi", domain: "kopi-pagi.jioo.site", status: "LIVE" },
  { id: "dep_2", project: "proj_batik_lestari", domain: "batik-lestari.jioo.site", status: "PENDING" },
  { id: "dep_3", project: "proj_sinar_jaya", domain: "sinar-jaya.jioo.site", status: "DEGRADED" },
];

export function DeployQueue() {
  const { toast } = useToast();
  const [rows, setRows] = useState(ROWS);

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
            <Td>
              <Link href={`/admin/projects/${row.project}`} className="font-medium text-ink hover:text-accent">
                {row.project}
              </Link>
            </Td>
            <Td>{row.domain}</Td>
            <Td><StatusBadge status={row.status} /></Td>
            <Td>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => toast({ title: "Health check", description: `${row.domain} merespons 200.` })}
                >
                  Health
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    setRows((current) =>
                      current.map((item) =>
                        item.id === row.id ? { ...item, status: "LIVE" } : item,
                      ),
                    )
                  }
                >
                  Deploy
                </Button>
              </div>
            </Td>
          </Tr>
        ))}
      </Tbody>
    </Table>
  );
}
