import { notFound } from "next/navigation";
import { PreviewPanel } from "@/modules/preview/components/preview-panel";
import { createOrGetJob, getLatestJob } from "@/shared/lib/jobs-server";
import {
  canAccess,
  findProject,
  toProject,
} from "@/shared/lib/projects-server";
import { currentUser } from "@/shared/lib/server-auth";
import { PageHeader } from "@/shared/ui";

export const dynamic = "force-dynamic";

export default async function PreviewPage({
  params,
}: {
  params: { projectId: string };
}) {
  const user = await currentUser();
  const record = user
    ? await findProject(params.projectId).catch(() => null)
    : null;
  if (!record || !user || !canAccess(
      record,
      user.role === "guest" ? undefined : user.id,
      user.role === "admin",
      user.guestId,
    )) {
    notFound();
  }
  const project = toProject(record);
  const job =
    (await getLatestJob(params.projectId).catch(() => null)) ??
    (await createOrGetJob(params.projectId).catch(() => null));

  return (
    <div>
      <PageHeader
        title="Preview"
        description="Bandingkan style dan layout sebelum memilih."
      />
      <PreviewPanel
        projectId={params.projectId}
        status={project.status}
        job={job}
      />
    </div>
  );
}
