"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { dateID } from "@/shared/lib/format";
import { Empty, Select, StatusBadge, Table, Tbody, Td, Th, Thead, Tr } from "@/shared/ui";
import type { Project, ProjectStatus } from "@/shared/types";

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "all", label: "Semua status" },
  { value: "DRAFT", label: "Draf" },
  { value: "INTAKE", label: "Isi Konteks" },
  { value: "COMPREHENDED", label: "Terkonfirmasi" },
  { value: "PREVIEWS", label: "Preview" },
  { value: "PAID", label: "Dibayar" },
  { value: "DEPLOYED", label: "Live" },
];

export function ProjectList({ projects }: { projects: Project[] }) {
  const [status, setStatus] = useState("all");
  const filtered = useMemo(
    () =>
      status === "all"
        ? projects
        : projects.filter((project) => project.status === (status as ProjectStatus)),
    [projects, status],
  );

  if (!projects.length) {
    return (
      <Empty
        title="Belum ada project"
        description="Mulai dari satu tipe produk, lalu isi business context."
        action={
          <Link
            href="/app/projects/new"
            className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-strong"
          >
            Buat Project
          </Link>
        }
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="max-w-xs">
        <Select
          label="Filter status"
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          options={STATUS_OPTIONS}
        />
      </div>

      {filtered.length ? (
        <Table>
          <Thead>
            <Tr>
              <Th>Project</Th>
              <Th>Tipe</Th>
              <Th>Status</Th>
              <Th>Diperbarui</Th>
              <Th>Aksi</Th>
            </Tr>
          </Thead>
          <Tbody>
            {filtered.map((project) => (
              <Tr key={project.id}>
                <Td>
                  <p className="font-medium text-ink">{project.clientLabel}</p>
                  <p className="text-xs text-muted">{project.id}</p>
                </Td>
                <Td>{project.productType}</Td>
                <Td>
                  <StatusBadge status={project.status} />
                </Td>
                <Td>{dateID(project.updatedAt)}</Td>
                <Td>
                  <Link
                    href={`/app/projects/${project.id}`}
                    className="text-sm font-medium text-accent hover:underline"
                  >
                    Buka
                  </Link>
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      ) : (
        <Empty
          title="Tidak ada project dengan status ini"
          description="Ubah filter untuk melihat project lain."
        />
      )}
    </div>
  );
}
