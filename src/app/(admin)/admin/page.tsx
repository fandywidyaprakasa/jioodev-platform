import Link from "next/link";
import { dateID, rupiah } from "@/shared/lib/format";
import { adminStats, listPackages } from "@/shared/lib/admin-server";
import { listProjects } from "@/shared/lib/projects-server";
import { Card, PageHeader, Stat, StatusBadge, Table, Tbody, Td, Th, Thead, Tr } from "@/shared/ui";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const [projects, packages] = await Promise.all([
    listProjects("", true).catch(() => []),
    listPackages().catch(() => []),
  ]);
  const stats = await adminStats().catch(() => ({
    projects: projects.length,
    pendingPayments: 0,
    liveDeployments: 0,
    activeUsers: 0,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard Admin"
        description="Ringkasan operasional platform."
      />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Project" value={projects.length} hint="Total" />
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
                <Td label="Project">
                  <Link href={`/admin/projects/${project.id}`} className="font-medium text-ink hover:text-accent">
                    {project.clientLabel}
                  </Link>
                </Td>
                <Td label="Tipe">{project.productType}</Td>
                <Td label="Status"><StatusBadge status={project.status} /></Td>
                <Td label="Update">{dateID(project.updatedAt)}</Td>
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
              <span className="text-muted">{rupiah(item.price)} · {item.deploy_included} deploy · {item.tier}</span>
              <StatusBadge status={item.status ?? (item.active ? "ACTIVE" : "EXPIRED")} />
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
