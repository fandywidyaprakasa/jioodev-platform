import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { QrisPanel } from "@/modules/payments/client";
import { PaymentStarter } from "@/modules/payments/client";
import { listPackages } from "@/modules/admin";
import { getLatestProjectPayment } from "@/modules/payments";
import { getPaymentEntitlement } from "@/modules/payments";
import { activateProjectViaEntitlement } from "@/modules/payments";
import {
  canAccess,
  findProject,
} from "@/modules/projects";
import { currentUser } from "@/modules/auth";
import { Card, PageHeader, Button } from "@/shared/ui";

export const dynamic = "force-dynamic";

export default async function PaymentPage(
  props: {
    params: Promise<{ projectId: string }>;
  }
) {
  const params = await props.params;
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

  const isAdmin = user.role === "admin";
  const entitlementUserId = user.role === "guest" ? undefined : user.id;
  const entitlement = await getPaymentEntitlement(entitlementUserId, isAdmin);

  if (entitlement.entitled) {
    const needsActivation = record.status === "PICKED" || (record.status === "PAID" && !usable);
    if (needsActivation) {
      await activateProjectViaEntitlement(params.projectId, {
        userId: entitlementUserId,
        isAdmin,
      }).catch(() => undefined);
    }
    return (
      <div>
        <PageHeader
          title="Pembayaran"
          description="Selesaikan pembayaran untuk memulai deploy."
        />
        <Card title="Langganan aktif — tidak perlu bayar">
          <p className="text-sm text-muted mb-4">
            Project ini tercakup langganan aktif Anda. Tidak perlu membayar lagi.
          </p>
          <Link href={`/app/projects/${params.projectId}/deploy`}>
            <Button>Lanjut ke deploy</Button>
          </Link>
        </Card>
      </div>
    );
  }

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
