import { redirect } from "next/navigation";
import { getSubscription } from "@/modules/account";
import { currentUser } from "@/modules/auth";
import { dateID } from "@/shared/lib/format";
import { Card, PageHeader, Progress, Stat, StatusBadge } from "@/shared/ui";

export const dynamic = "force-dynamic";

export default async function SubscriptionPage() {
  const user = await currentUser();
  if (!user || user.role === "guest") redirect("/login?next=/app/account/subscription");
  const subscription =
    (await getSubscription(user.id).catch(() => null)) ?? {
      plan: "Belum berlangganan",
      status: "EXPIRED" as const,
      quotaUsed: 0,
      quotaTotal: 0,
      renewAt: new Date().toISOString(),
    };

  return (
    <div>
      <PageHeader
        title="Paket & Kuota"
        description="Paket aktif, sisa deploy, dan perpanjangan."
      />
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Paket" value={subscription.plan} />
        <Stat label="Status" value={<StatusBadge status={subscription.status} />} />
        <Stat label="Perpanjangan" value={dateID(subscription.renewAt)} />
      </div>
      <Card title="Kuota deploy" className="mt-6">
        <Progress
          value={subscription.quotaUsed}
          max={subscription.quotaTotal || 1}
          label={`${subscription.quotaUsed} dari ${subscription.quotaTotal} terpakai`}
        />
        <p className="mt-3 text-sm text-muted">
          Hubungi admin untuk menambah kuota atau memperpanjang paket.
        </p>
      </Card>
    </div>
  );
}
