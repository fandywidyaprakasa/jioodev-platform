import { redirect, notFound } from "next/navigation";
import { GenerationProgress } from "@/modules/generation/client";
import { mockJob } from "@/shared/lib/mock-data";
import { createOrGetJob } from "@/modules/generation";
import {
  canAccess,
  findProject,
} from "@/modules/projects";
import { currentUser } from "@/modules/auth";
import { PageHeader } from "@/shared/ui";

export const dynamic = "force-dynamic";

export default async function GeneratePage(
  props: {
    params: Promise<{ projectId: string }>;
  }
) {
  const params = await props.params;
  const user = await currentUser();
  const record = user
    ? await findProject(params.projectId).catch(() => null)
    : null;
  if (
    !record ||
    !user ||
    !canAccess(
      record,
      user.role === "guest" ? undefined : user.id,
      user.role === "admin",
      user.guestId,
    )
  ) {
    notFound();
  }
  if (!record.template_id) {
    redirect(`/app/projects/${params.projectId}/templates`);
  }
  if (!["TEMPLATE_CHOSEN", "GENERATING", "PREVIEWS"].includes(record.status ?? "")) {
    redirect(`/app/projects/${params.projectId}`);
  }

  const job =
    (await createOrGetJob(params.projectId).catch(() => null)) ?? mockJob;

  return (
    <div>
      <PageHeader
        title="Generate Varian"
        description="Hermes membuat beberapa arah desain dari template terpilih."
      />
      <GenerationProgress projectId={params.projectId} job={job} />
    </div>
  );
}
