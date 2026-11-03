import { AssetUploader } from "@/modules/projects/components/asset-uploader";
import { BusinessIntakeForm } from "@/modules/projects/components/business-intake-form";
import { notFound } from "next/navigation";
import { currentUser } from "@/shared/lib/server-auth";
import {
  canAccess,
  findProject,
  getBusinessProfile,
} from "@/shared/lib/projects-server";
import { mockBusinessContext } from "@/shared/lib/mock-data";
import { listProjectAssets } from "@/shared/lib/assets-server";
import type { BusinessContext } from "@/shared/types";
import { PageHeader } from "@/shared/ui";

export const dynamic = "force-dynamic";

export default async function ContextPage({
  params,
}: {
  params: { projectId: string };
}) {
  const user = await currentUser();
  const project = user ? await findProject(params.projectId) : null;
  if (!project || !user || !canAccess(
      project,
      user.role === "guest" ? undefined : user.id,
      user.role === "admin",
      user.guestId,
    )) {
    notFound();
  }

  const profile = await getBusinessProfile(params.projectId);
  const initial: BusinessContext = profile
    ? {
        businessName: profile.business_name ?? "",
        industry: profile.industry ?? "",
        businessPurpose: profile.business_purpose ?? [],
        targetAudience: profile.target_audience ?? "",
        channels: profile.channels ?? [],
        designPref: profile.design_pref ?? "",
        businessGoals: profile.business_goals ?? "",
      }
    : { ...mockBusinessContext, businessName: "" };

  const assets = await listProjectAssets(params.projectId).catch(() => []);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Business Context"
        description="Isi konteks bisnis agar template dan copy relevan."
      />
      <BusinessIntakeForm projectId={params.projectId} initial={initial} />
      <AssetUploader projectId={params.projectId} initial={assets} />
    </div>
  );
}
