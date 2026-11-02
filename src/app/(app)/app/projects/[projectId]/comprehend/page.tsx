import { ComprehendReview } from "@/modules/projects/components/comprehend-review";
import { api } from "@/shared/lib/api";
import { PageHeader } from "@/shared/ui";

export default async function ComprehendPage({
  params,
}: {
  params: { projectId: string };
}) {
  const result = await api.projects.comprehend(params.projectId);

  return (
    <div>
      <PageHeader
        eyebrow="Project"
        title="Konfirmasi Pemahaman"
        description="Pastikan ringkasan AI sesuai dengan bisnis Anda."
      />
      <ComprehendReview projectId={params.projectId} result={result} />
    </div>
  );
}
