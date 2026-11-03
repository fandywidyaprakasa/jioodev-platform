import { notFound } from "next/navigation";
import { TemplatePicker } from "@/modules/catalog/components/template-picker";
import { listTemplates } from "@/shared/lib/templates-server";
import {
  canAccess,
  findProject,
  getBusinessProfile,
} from "@/shared/lib/projects-server";
import { currentUser } from "@/shared/lib/server-auth";
import { PageHeader } from "@/shared/ui";

export const dynamic = "force-dynamic";

export default async function ProjectTemplatesPage({
  params,
}: {
  params: { projectId: string };
}) {
  const user = await currentUser();
  const project = user
    ? await findProject(params.projectId).catch(() => null)
    : null;
  if (
    !project ||
    !user ||
    !canAccess(
      project,
      user.role === "guest" ? undefined : user.id,
      user.role === "admin",
      user.guestId,
    )
  ) {
    notFound();
  }

  const [templates, profile] = await Promise.all([
    listTemplates(),
    getBusinessProfile(params.projectId).catch(() => null),
  ]);
  const byType = templates.filter(
    (template) => template.productType === project.product_type,
  );
  const score = (template: (typeof templates)[number]) =>
    (profile?.industry && template.industries.includes(profile.industry) ? 2 : 0) +
    (profile?.business_purpose ?? []).filter((purpose) =>
      template.purposes.includes(purpose),
    ).length;
  const relevant = [...(byType.length ? byType : templates)].sort(
    (a, b) => score(b) - score(a),
  );

  return (
    <div>
      <PageHeader
        title="Pilih Template"
        description="Template menentukan fondasi struktur halaman."
      />
      <TemplatePicker
        projectId={params.projectId}
        templates={relevant}
        contextNote={`Direkomendasikan untuk ${project.product_type}${
          profile?.industry ? ` · industri ${profile.industry}` : ""
        }`}
      />
    </div>
  );
}
