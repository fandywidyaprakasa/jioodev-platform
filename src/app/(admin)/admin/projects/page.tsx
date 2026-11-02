import Link from "next/link";
import { api } from "@/shared/lib/api";
import { dateID } from "@/shared/lib/format";
import { PageHeader, StatusBadge, Table, Tbody, Td, Th, Thead, Tr } from "@/shared/ui";

export default async function AdminProjectsPage() {
  const projects = await api.projects.list();

  return (
    <div>
      <PageHeader
        eyebrow="Admin"
        title="Semua Project"
        description="Kelola seluruh project lintas user."
      />
      <Table>
        <Thead>
          <Tr>
            <Th>Project</Th>
            <Th>Tipe</Th>
            <Th>Status</Th>
            <Th>Business</Th>
            <Th>Update</Th>
            <Th>Aksi</Th>
          </Tr>
        </Thead>
        <Tbody>
          {projects.map((project) => (
            <Tr key={project.id}>
              <Td>{project.clientLabel}</Td>
              <Td>{project.productType}</Td>
              <Td><StatusBadge status={project.status} /></Td>
              <Td>{project.businessName ?? "—"}</Td>
              <Td>{dateID(project.updatedAt)}</Td>
              <Td>
                <Link href={`/admin/projects/${project.id}`} className="text-sm font-medium text-accent hover:underline">
                  Detail
                </Link>
              </Td>
            </Tr>
          ))}
        </Tbody>
      </Table>
    </div>
  );
}
