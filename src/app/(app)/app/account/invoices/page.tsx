import { api } from "@/shared/lib/api";
import { dateID, rupiah } from "@/shared/lib/format";
import { Button, PageHeader, StatusBadge, Table, Tbody, Td, Th, Thead, Tr } from "@/shared/ui";

export default async function InvoicesPage() {
  const invoices = await api.account.invoices();

  return (
    <div>
      <PageHeader
        eyebrow="Akun"
        title="Tagihan"
        description="Invoice dan status pembayaran."
      />
      <Table>
        <Thead>
          <Tr>
            <Th>Invoice</Th>
            <Th>Nominal</Th>
            <Th>Status</Th>
            <Th>Tanggal</Th>
            <Th>Aksi</Th>
          </Tr>
        </Thead>
        <Tbody>
          {invoices.map((invoice) => (
            <Tr key={invoice.id}>
              <Td>{invoice.id}</Td>
              <Td>{rupiah(invoice.amount)}</Td>
              <Td>
                <StatusBadge status={invoice.status} />
              </Td>
              <Td>{dateID(invoice.issuedAt)}</Td>
              <Td>
                <Button size="sm" variant="secondary">
                  Unduh
                </Button>
              </Td>
            </Tr>
          ))}
        </Tbody>
      </Table>
    </div>
  );
}
