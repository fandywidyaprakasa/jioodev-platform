import { DeployQueue } from "@/modules/admin/components/deploy-queue";
import { PageHeader } from "@/shared/ui";

export default function AdminDeployPage() {
  return (
    <div>
      <PageHeader
        eyebrow="Admin"
        title="Deploy"
        description="Antrian deploy, health check, dan rollback."
      />
      <DeployQueue />
    </div>
  );
}
