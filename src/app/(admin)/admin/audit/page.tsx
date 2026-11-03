import { listAudit } from "@/shared/lib/activity-server";
import { dateTimeID } from "@/shared/lib/format";
import { Empty, PageHeader, Table, Tbody, Td, Th, Thead, Tr } from "@/shared/ui";

export const dynamic = "force-dynamic";

export default async function AdminAuditPage() {
  const audit = await listAudit().catch(() => []);

  return (
    <div>
      <PageHeader
        title="Audit Log"
        description="Riwayat aksi admin dan sistem."
      />
      {audit.length ? (
        <Table>
          <Thead>
            <Tr>
              <Th>Aktor</Th>
              <Th>Aksi</Th>
              <Th>IP</Th>
              <Th>Waktu</Th>
            </Tr>
          </Thead>
          <Tbody>
            {audit.map((item) => (
              <Tr key={item.id}>
                <Td label="Aktor">{item.actor}</Td>
                <Td label="Aksi">{item.action}</Td>
                <Td label="IP">{item.ip || "—"}</Td>
                <Td label="Waktu">{dateTimeID(item.createdAt)}</Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      ) : (
        <Empty title="Belum ada audit" description="Aksi admin akan tercatat di sini." />
      )}
    </div>
  );
}
