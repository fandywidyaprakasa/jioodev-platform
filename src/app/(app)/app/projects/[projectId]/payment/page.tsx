import { notFound, redirect } from "next/navigation";
import { QrisPanel } from "@/modules/payments/components/qris-panel";
import { PaymentStarter } from "@/modules/payments/components/payment-starter";
import { listPackages } from "@/shared/lib/admin-server";
import { getLatestProjectPayment } from "@/shared/lib/payments-server";
import {
  canAccess,
  findProject,
} from "@/shared/lib/projects-server";
import { currentUser } from "@/shared/lib/server-auth";
import { Card, PageHeader } from "@/shared/ui";

export const dynamic = "force-dynamic";

export default async function PaymentPage({
  params,
}: {
  params: { projectId: string };
}) {
  const user = await currentUser();
  const record = user
    ? await findProject(params.projectId).catch(() => null)
    : null;
  if (!record || !user || !canAccess(
      record,
      user.role === "guest" ? undefined : user.id,
      user.role === "admin",
      user.guestId,
    )) {
    notFound();
  }

  const payable = ["PICKED", "PAID", "DEPLOYED", "ACTIVE"].includes(
    record.status ?? "",
  );
  if (!payable) redirect(`/app/projects/${params.projectId}`);

  const [payment, packages] = await Promise.all([
    getLatestProjectPayment(params.projectId).catch(() => null),
    listPackages().catch(() => []),
  ]);
  const usable =
    payment &&
    (payment.status === "CONFIRMED" ||
      (payment.status === "PENDING" &&
        new Date(payment.expiresAt).getTime() > Date.now()));
  const canChoosePackage =
    record.status === "PICKED" || record.status === "PAID";

  return (
    <div>
      <PageHeader
        title="Pembayaran"
        description="Selesaikan pembayaran untuk memulai deploy."
      />
      {usable && payment ? (
        <QrisPanel payment={payment} />
      ) : canChoosePackage ? (
        <PaymentStarter
          projectId={params.projectId}
          packages={packages.filter((item) => item.active)}
        />
      ) : (
        <Card title="Pembayaran belum tersedia">
          <p className="text-sm text-muted">
            Pembayaran belum dapat dibuat. Muat ulang halaman atau hubungi admin jika
            masalah berlanjut.
          </p>
        </Card>
      )}
    </div>
  );
}
