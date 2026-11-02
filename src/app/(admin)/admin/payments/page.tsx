import { PaymentQueue } from "@/modules/admin/components/payment-queue";
import { mockPayment } from "@/shared/lib/mock-data";
import { PageHeader } from "@/shared/ui";
import type { Payment } from "@/shared/types";

export default function AdminPaymentsPage() {
  const payments: Payment[] = [
    mockPayment,
    {
      ...mockPayment,
      id: "pay_batik_02",
      projectId: "proj_batik_lestari",
      amount: 349000,
      status: "PENDING",
    },
  ];

  return (
    <div>
      <PageHeader
        eyebrow="Admin"
        title="Pembayaran"
        description="Konfirmasi pembayaran manual dan refund."
      />
      <PaymentQueue initial={payments} />
    </div>
  );
}
