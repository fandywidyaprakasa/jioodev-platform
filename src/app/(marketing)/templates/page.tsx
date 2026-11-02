import { TemplateGrid } from "@/modules/catalog/components/template-grid";
import { api } from "@/shared/lib/api";
import { PageHeader } from "@/shared/ui";

export default async function TemplatesPage() {
  const templates = await api.templates.list();

  return (
    <div>
      <PageHeader
        eyebrow="Katalog"
        title="Template"
        description="Jelajahi Design Foundation JiooDev."
      />
      <TemplateGrid templates={templates} hrefBase="/templates" />
    </div>
  );
}
