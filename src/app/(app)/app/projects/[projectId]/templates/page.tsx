import { TemplatePicker } from "@/modules/catalog/components/template-picker";
import { api } from "@/shared/lib/api";
import { PageHeader } from "@/shared/ui";

export default async function ProjectTemplatesPage({
  params,
}: {
  params: { projectId: string };
}) {
  const templates = await api.templates.list();

  return (
    <div>
      <PageHeader
        eyebrow="Project"
        title="Pilih Template"
        description="Template menentukan fondasi struktur halaman."
      />
      <TemplatePicker projectId={params.projectId} templates={templates} />
    </div>
  );
}
