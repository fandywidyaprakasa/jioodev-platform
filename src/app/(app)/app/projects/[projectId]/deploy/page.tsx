import { notFound, redirect } from "next/navigation";
import { DeployPanel } from "@/modules/publishing/client";
import {
  canAccess,
  findProject,
} from "@/modules/projects";
import { currentUser } from "@/modules/auth";
import { PageHeader } from "@/shared/ui";

export const dynamic = "force-dynamic";

export default async function DeployPage(
  props: {
    params: Promise<{ projectId: string }>;
  }
) {
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

  if (!["PAID", "DEPLOYED", "ACTIVE"].includes(record.status ?? "")) {
    redirect(`/app/projects/${params.projectId}`);
  }

  return (
    <div>
      <PageHeader
        title="Publish Halaman"
        description="Halaman publik project dan domain opsional."
      />
      <DeployPanel projectId={params.projectId} />
    </div>
  );
}
