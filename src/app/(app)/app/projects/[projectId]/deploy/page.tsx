import { DeployPanel } from "@/modules/admin/components/deploy-panel";
import { PageHeader } from "@/shared/ui";

export default function DeployPage({
  params,
}: {
  params: { projectId: string };
}) {
  return (
    <div>
      <PageHeader
        eyebrow="Project"
        title="Deploy"
        description="Pantau status live dan domain."
      />
      <DeployPanel projectId={params.projectId} />
    </div>
  );
}
