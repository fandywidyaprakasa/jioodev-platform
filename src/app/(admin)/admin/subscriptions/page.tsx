import { SubscriptionManager } from "@/modules/admin/client";
import { listUsersWithSubscriptions } from "@/modules/admin";
import { PageHeader } from "@/shared/ui";

export const dynamic = "force-dynamic";

export default async function AdminSubscriptionsPage() {
  const initial = await listUsersWithSubscriptions().catch(() => []);

  return (
    <div>
      <PageHeader
        title="Langganan User"
        description="Kelola langganan, kuota, dan masa aktif pengguna."
      />
      <SubscriptionManager initial={initial} />
    </div>
  );
}