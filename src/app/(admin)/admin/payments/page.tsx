import { PaymentQueue } from "@/modules/admin/client";
import { listPayments } from "@/modules/payments";
import { PageHeader } from "@/shared/ui";

export const dynamic = "force-dynamic";

export default async function AdminPaymentsPage() {
  const payments = await listPayments().catch(() => []);
  const initial = payments;

  return (
    <div>
      <PageHeader
        title="Pembayaran"
        description="Konfirmasi pembayaran manual dan refund."
      />
      <PaymentQueue initial={initial} />
    </div>
  );
}
