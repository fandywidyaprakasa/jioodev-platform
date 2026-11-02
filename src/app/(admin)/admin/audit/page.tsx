import { api } from "@/shared/lib/api";
import { dateTimeID } from "@/shared/lib/format";
import { PageHeader, Table, Tbody, Td, Th, Thead, Tr } from "@/shared/ui";

export default async function AdminAuditPage() {
  const audit = await api.admin.audit();

  return (
    <div>
      <PageHeader
        eyebrow="Admin"
        title="Audit Log"
        description="Riwayat aksi admin dan sistem."
      />
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
              <Td>{item.actor}</Td>
              <Td>{item.action}</Td>
              <Td>{item.ip}</Td>
              <Td>{dateTimeID(item.createdAt)}</Td>
            </Tr>
          ))}
        </Tbody>
      </Table>
    </div>
  );
}
