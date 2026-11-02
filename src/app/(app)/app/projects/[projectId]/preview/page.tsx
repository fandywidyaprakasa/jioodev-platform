import { PreviewPanel } from "@/modules/preview/components/preview-panel";
import { PageHeader } from "@/shared/ui";

export default function PreviewPage({
  params,
}: {
  params: { projectId: string };
}) {
  return (
    <div>
      <PageHeader
        eyebrow="Project"
        title="Preview"
        description="Bandingkan style dan layout sebelum memilih."
      />
      <PreviewPanel projectId={params.projectId} />
    </div>
  );
}
