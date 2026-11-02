import { QrisPanel } from "@/modules/payments/components/qris-panel";
import { api } from "@/shared/lib/api";
import { PageHeader } from "@/shared/ui";

export default async function PaymentPage({
  params,
}: {
  params: { projectId: string };
}) {
  const payment = await api.payments.get(params.projectId);

  return (
    <div>
      <PageHeader
        eyebrow="Project"
        title="Pembayaran"
        description="Selesaikan pembayaran untuk memulai deploy."
      />
      <QrisPanel payment={payment} />
    </div>
  );
}
