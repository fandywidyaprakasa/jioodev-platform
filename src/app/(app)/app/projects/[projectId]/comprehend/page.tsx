import { ComprehendReview } from "@/modules/projects/client";
import {
  canAccess,
  findProject,
  getBusinessProfile,
  summarizeBusiness,
} from "@/modules/projects";
import { notFound } from "next/navigation";
import { currentUser } from "@/modules/auth";
import { PageHeader } from "@/shared/ui";

export const dynamic = "force-dynamic";

export default async function ComprehendPage(
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
