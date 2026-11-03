import { redirect } from "next/navigation";
import { listInvoices } from "@/shared/lib/account-server";
import { currentUser } from "@/shared/lib/server-auth";
import { dateID, rupiah } from "@/shared/lib/format";
import { Empty, PageHeader, StatusBadge, Table, Tbody, Td, Th, Thead, Tr } from "@/shared/ui";

export const dynamic = "force-dynamic";

export default async function InvoicesPage() {
  const user = await currentUser();
  if (!user || user.role === "guest") redirect("/login?next=/app/account/invoices");
  const invoices = await listInvoices(user.id).catch(() => []);

  return (
    <div>
      <PageHeader
        title="Tagihan"
        description="Invoice dan status pembayaran."
      />
      {invoices.length ? (
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
                <Td label="Invoice">{invoice.invoiceNo ?? invoice.id}</Td>
                <Td label="Nominal">{rupiah(invoice.amount)}</Td>
                <Td label="Status">
                  <StatusBadge status={invoice.status} />
                </Td>
                <Td label="Tanggal">{dateID(invoice.issuedAt)}</Td>
                <Td label="Aksi">
                  <a
                    href={`/api/account/invoices/${invoice.id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-full border border-line px-3 py-1.5 text-xs font-medium text-ink hover:border-ink/40"
                  >
                    Unduh
                  </a>
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      ) : (
        <Empty title="Belum ada invoice" description="Invoice muncul setelah pembayaran dibuat." />
      )}
    </div>
  );
}
