import { notFound, redirect } from "next/navigation";
import { DeployPanel } from "@/modules/admin/components/deploy-panel";
import {
  canAccess,
  findProject,
} from "@/shared/lib/projects-server";
import { currentUser } from "@/shared/lib/server-auth";
import { PageHeader } from "@/shared/ui";

export const dynamic = "force-dynamic";

export default async function DeployPage({
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
