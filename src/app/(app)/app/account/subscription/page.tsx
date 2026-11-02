import { api } from "@/shared/lib/api";
import { dateID } from "@/shared/lib/format";
import { Card, PageHeader, Progress, Stat, StatusBadge } from "@/shared/ui";

export default async function SubscriptionPage() {
  const subscription = await api.account.subscription();

  return (
    <div>
      <PageHeader
        eyebrow="Akun"
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
          max={subscription.quotaTotal}
          label={`${subscription.quotaUsed} dari ${subscription.quotaTotal} terpakai`}
        />
        <p className="mt-3 text-sm text-muted">
          Hubungi admin untuk menambah kuota atau memperpanjang paket.
        </p>
      </Card>
    </div>
  );
}
