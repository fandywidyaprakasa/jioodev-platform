import { DeployQueue } from "@/modules/admin/components/deploy-queue";
import { listDeployments } from "@/shared/lib/deploy-server";
import { PageHeader } from "@/shared/ui";

export const dynamic = "force-dynamic";

export default async function AdminDeployPage() {
  const deployments = await listDeployments().catch(() => []);
  return (
    <div>
      <PageHeader
        title="Deploy"
        description="Antrian deploy, health check, dan rollback."
      />
      <DeployQueue initial={deployments} />
    </div>
  );
}
