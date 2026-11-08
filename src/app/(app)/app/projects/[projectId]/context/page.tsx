import { AssetUploader } from "@/modules/projects/client";
import { BusinessIntakeForm } from "@/modules/projects/client";
import { notFound } from "next/navigation";
import { currentUser } from "@/modules/auth";
import {
  canAccess,
  findProject,
  getBusinessProfile,
} from "@/modules/projects";
import { mockBusinessContext } from "@/shared/lib/mock-data";
import { listProjectAssets } from "@/modules/projects";
import type { BusinessContext } from "@/shared/types";
import { PageHeader } from "@/shared/ui";

export const dynamic = "force-dynamic";

export default async function ContextPage(
  props: {
    params: Promise<{ projectId: string }>;
    searchParams?: Promise<{ mode?: string }>;
  }
) {
  const searchParams = await props.searchParams;
  const params = await props.params;
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
  const mode = searchParams?.mode === "idea" ? "idea" : "guide";
  const autoComprehend = ["DRAFT", "INTAKE", "COMPREHENDED"].includes(
    project.status ?? "",
  );

  return (
    <div className="space-y-4">
      <PageHeader
        title="Business Brief"
        description={
          mode === "idea"
            ? "Tulis ide dan preferensi Anda; AI merapikan menjadi brief yang siap diproduksi."
            : "Ceritakan bisnis Anda; AI membantu merumuskan arah website yang sesuai."
        }
      />
      <BusinessIntakeForm
        projectId={params.projectId}
        initial={initial}
        mode={mode}
        autoComprehend={autoComprehend}
        hasTemplate={Boolean(project.template_id)}
      />
      <AssetUploader projectId={params.projectId} initial={assets} />
    </div>
  );
}
