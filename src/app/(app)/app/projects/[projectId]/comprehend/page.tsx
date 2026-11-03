import { ComprehendReview } from "@/modules/projects/components/comprehend-review";
import {
  canAccess,
  findProject,
  getBusinessProfile,
  summarizeBusiness,
} from "@/shared/lib/projects-server";
import { notFound } from "next/navigation";
import { currentUser } from "@/shared/lib/server-auth";
import { PageHeader } from "@/shared/ui";

export const dynamic = "force-dynamic";

export default async function ComprehendPage({
  params,
}: {
  params: { projectId: string };
}) {
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

  const profile = await getBusinessProfile(params.projectId).catch(() => null);

  return (
    <div>
      <PageHeader
        title="Konfirmasi Pemahaman"
        description="Pastikan ringkasan AI sesuai dengan bisnis Anda."
      />
      <ComprehendReview
        projectId={params.projectId}
        result={summarizeBusiness(profile)}
      />
    </div>
  );
}
