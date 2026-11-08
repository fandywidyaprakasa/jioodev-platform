import { CustomizeEditor } from "@/modules/sections/client";
import { mockCopy, mockSections } from "@/shared/lib/mock-data";
import { getProjectCopy } from "@/modules/projects";
import { getLatestJob } from "@/modules/generation";
import { listSectionVariants } from "@/modules/sections";
import {
  canAccess,
  findProject,
  getProjectSections,
} from "@/modules/projects";
import { notFound, redirect } from "next/navigation";
import { currentUser } from "@/modules/auth";
import { PageHeader } from "@/shared/ui";

export const dynamic = "force-dynamic";

export default async function CustomizePage(
  props: {
    params: Promise<{ projectId: string }>;
  }
) {
  const params = await props.params;
  const user = await currentUser();
  const project = user
    ? await findProject(params.projectId).catch(() => null)
    : null;
  if (!project || !user || !canAccess(
      project,
      user.role === "guest" ? undefined : user.id,
      user.role === "admin",
      user.guestId,
    )) {
    notFound();
  }

  if (!["PICKED", "PAID", "DEPLOYED", "ACTIVE"].includes(project.status ?? "")) {
    redirect(`/app/projects/${params.projectId}/preview`);
  }

  const [sections, copy, job] = await Promise.all([
    getProjectSections(params.projectId, mockSections),
    getProjectCopy(params.projectId, mockCopy),
    getLatestJob(params.projectId).catch(() => null),
  ]);
  const editableSections = await Promise.all(
    sections.map(async (section) => ({
      ...section,
      variants: await listSectionVariants(section.code).catch(() => []),
    })),
  );
  const chosen = (project.chosen_variant as { id?: string } | null)?.id;
  const variant =
    job?.variants.find((item) => item.id === chosen) ?? job?.variants[0];

  return (
    <div>
      <PageHeader
        title="Customize"
        description="Atur section dan copy tanpa menyentuh HTML."
      />
      <CustomizeEditor
        projectId={params.projectId}
        sections={editableSections}
        copy={copy}
        previewUrl={variant?.previewUrl}
        businessName={project.client_label ?? undefined}
      />
    </div>
  );
}
