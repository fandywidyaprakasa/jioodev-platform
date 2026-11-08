import { AssetUploader } from "@/modules/projects/client";
import { BusinessIntakeForm } from "@/modules/projects/client";
import { notFound } from "next/navigation";
import { currentUser } from "@/modules/auth";
import {
  canAccess,
  findProject,
  getBusinessProfile,
} from "@/modules/projects";
import { listProjectAssets } from "@/modules/projects";
import type { BusinessContext } from "@/shared/types";
import { PageHeader } from "@/shared/ui";

const EMPTY_BUSINESS_CONTEXT: BusinessContext = {
  businessName: "",
  industry: "",
  businessPurpose: [],
  targetAudience: "",
  channels: [],
  designPref: "",
  businessGoals: "",
};

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
    : EMPTY_BUSINESS_CONTEXT;

  const assets = await listProjectAssets(params.projectId).catch(() => []);
  const mode = searchParams?.mode === "idea" ? "idea" : "guide";
  const reviewComprehension = ["DRAFT", "INTAKE", "COMPREHENDED"].includes(
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
      {!profile ? (
        <p className="rounded-md border border-line bg-paper p-3 text-sm text-muted">
          Belum ada konteks bisnis tersimpan. Isi brief di bawah untuk memulai;
          ringkasan AI akan dibuat setelah brief disimpan.
        </p>
      ) : null}
      <BusinessIntakeForm
        projectId={params.projectId}
        initial={initial}
        mode={mode}
        reviewComprehension={reviewComprehension}
      />
      <AssetUploader projectId={params.projectId} initial={assets} />
    </div>
  );
}
