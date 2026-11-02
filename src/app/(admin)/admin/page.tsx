import Link from "next/link";
import { api } from "@/shared/lib/api";
import { dateID, rupiah } from "@/shared/lib/format";
import { Card, PageHeader, Stat, StatusBadge, Table, Tbody, Td, Th, Thead, Tr } from "@/shared/ui";

export default async function AdminDashboardPage() {
  const [stats, projects, packages] = await Promise.all([
    api.admin.stats(),
    api.projects.list(),
    api.admin.packages(),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Admin"
        title="Dashboard Admin"
        description="Ringkasan operasional platform."
      />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Project" value={stats.projects} hint="Total" />
        <Stat label="Pembayaran" value={stats.pendingPayments} hint="Menunggu konfirmasi" />
        <Stat label="Deploy live" value={stats.liveDeployments} hint="Aktif" />
        <Stat label="User aktif" value={stats.activeUsers} hint="30 hari" />
      </div>

      <Card title="Project terbaru" actions={<Link href="/admin/projects" className="text-sm text-accent">Lihat semua</Link>}>
        <Table>
          <Thead>
            <Tr>
              <Th>Project</Th>
              <Th>Tipe</Th>
              <Th>Status</Th>
              <Th>Update</Th>
            </Tr>
          </Thead>
          <Tbody>
            {projects.slice(0, 4).map((project) => (
              <Tr key={project.id}>
                <Td>
                  <Link href={`/admin/projects/${project.id}`} className="font-medium text-ink hover:text-accent">
                    {project.clientLabel}
                  </Link>
                </Td>
                <Td>{project.productType}</Td>
                <Td><StatusBadge status={project.status} /></Td>
                <Td>{dateID(project.updatedAt)}</Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </Card>

      <Card title="Paket aktif">
        <ul className="divide-y divide-line">
          {packages.map((item) => (
            <li key={item.id} className="flex items-center justify-between gap-3 py-3 text-sm">
              <span className="font-medium text-ink">{item.name}</span>
              <span className="text-muted">{rupiah(item.price)} · {item.quota} deploy</span>
              <StatusBadge status={item.active ? "ACTIVE" : "EXPIRED"} />
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
