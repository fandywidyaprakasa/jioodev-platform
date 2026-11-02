import { CustomizeEditor } from "@/modules/sections/components/customize-editor";
import { mockCopy, mockSections } from "@/shared/lib/mock-data";
import { PageHeader } from "@/shared/ui";

export default function CustomizePage({
  params,
}: {
  params: { projectId: string };
}) {
  return (
    <div>
      <PageHeader
        eyebrow="Project"
        title="Customize"
        description="Atur section dan copy tanpa menyentuh HTML."
      />
      <CustomizeEditor
        projectId={params.projectId}
        sections={mockSections}
        copy={mockCopy}
      />
    </div>
  );
}
