import { notFound } from "next/navigation";
import { PreviewPanel } from "@/modules/preview/client";
import { createOrGetJob, getLatestJob } from "@/modules/generation";
import {
  canAccess,
  findProject,
  toProject,
} from "@/modules/projects";
import { currentUser } from "@/modules/auth";
import { PageHeader } from "@/shared/ui";

export const dynamic = "force-dynamic";

export default async function PreviewPage(
  props: {
    params: Promise<{ projectId: string }>;
    searchParams?: Promise<{ axis?: string }>;
  }
) {
  const searchParams = await props.searchParams;
  const params = await props.params;
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
  const axis = searchParams?.axis === "layout" ? "layout" : "style";
  const job =
    (await createOrGetJob(params.projectId, { axis }).catch(() => null)) ??
    (await getLatestJob(params.projectId).catch(() => null));

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
        axis={axis}
      />
    </div>
  );
}
