"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { dateID } from "@/shared/lib/format";
import { productLabel } from "@/shared/lib/taxonomy";
import { Empty, Select, StatusBadge, Table, Tbody, Td, Th, Thead, Tr } from "@/shared/ui";
import { groupProjects } from "../group-projects";
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

export function ProjectList({
  projects,
  basePath = "/app/projects",
  showCreate = true,
}: {
  projects: Project[];
  basePath?: string;
  showCreate?: boolean;
}) {
  const [status, setStatus] = useState("all");
  const filtered = useMemo(
    () =>
      status === "all"
        ? projects
        : projects.filter((project) => project.status === (status as ProjectStatus)),
    [projects, status],
  );
  const groups = useMemo(() => groupProjects(filtered), [filtered]);

  if (!projects.length) {
    return (
      <Empty
        title="Belum ada project"
        description="Mulai dari satu project Landing, lalu isi business context klien."
        action={
          showCreate ? (
            <Link
              href="/app/projects/new"
              className="inline-flex items-center rounded-full bg-accent px-4 py-2 text-sm font-medium text-on-accent transition-[background-color,border-color,color,transform] duration-150 active:scale-[0.96] hover:bg-accent-strong"
            >
              Buat Project
            </Link>
          ) : undefined
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
        <div className="space-y-6">
          {groups.map((group, index) => (
            <section key={group.label} aria-labelledby={`client-group-${index}`}>
              <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
                <h2 id={`client-group-${index}`} className="text-[15px] font-semibold text-ink">
                  {group.label}
                </h2>
                <p className="text-xs text-muted">{group.projects.length} project</p>
              </div>
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
                  {group.projects.map((project) => (
                    <Tr key={project.id}>
                      <Td label="Project">
                        <p className="font-medium text-ink">{project.clientLabel}</p>
                        <p className="font-mono text-[10px] text-muted">{project.id}</p>
                      </Td>
                      <Td label="Tipe">{productLabel(project.productType)}</Td>
                      <Td label="Status">
                        <StatusBadge status={project.status} />
                      </Td>
                      <Td label="Diperbarui">{dateID(project.updatedAt)}</Td>
                      <Td label="Aksi">
                        <Link
                          href={`${basePath}/${project.id}`}
                          className="text-sm font-medium text-accent hover:underline"
                        >
                          Buka
                        </Link>
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </section>
          ))}
        </div>
      ) : (
        <Empty
          title="Tidak ada project dengan status ini"
          description="Ubah filter untuk melihat project lain."
        />
      )}
    </div>
  );
}
