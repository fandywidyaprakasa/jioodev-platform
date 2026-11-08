import { DeployQueue } from "@/modules/publishing/client";
import { listDeployments } from "@/modules/publishing";
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
