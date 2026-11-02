import { GenerationProgress } from "@/modules/transformation/components/generation-progress";
import { api } from "@/shared/lib/api";
import { PageHeader } from "@/shared/ui";

export default async function GeneratePage({
  params,
}: {
  params: { projectId: string };
}) {
  const job = await api.generation.start(params.projectId);

  return (
    <div>
      <PageHeader
        eyebrow="Project"
        title="Generate Varian"
        description="Hermes membuat beberapa arah desain dari template terpilih."
      />
      <GenerationProgress projectId={params.projectId} job={job} />
    </div>
  );
}
