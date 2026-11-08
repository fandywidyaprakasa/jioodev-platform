import { notFound } from "next/navigation";
import { ThemeCatalog } from "@/modules/catalog/client";
import {
  listThemes,
  themeScore,
  themesForProduct,
} from "@/modules/catalog";
import {
  canAccess,
  findProject,
  getBusinessProfile,
  summarizeBusiness,
} from "@/modules/projects";
import { currentUser } from "@/modules/auth";
import { industryLabel, productLabel, purposeLabels } from "@/shared/lib/taxonomy";
import { Card, PageHeader } from "@/shared/ui";

export const dynamic = "force-dynamic";

export default async function ProjectTemplatesPage(
  props: {
    params: Promise<{ projectId: string }>;
  }
) {
  const params = await props.params;
  const user = await currentUser();
  const project = user
    ? await findProject(params.projectId).catch(() => null)
    : null;
  if (
    !project ||
    !user ||
    !canAccess(
      project,
      user.role === "guest" ? undefined : user.id,
      user.role === "admin",
      user.guestId,
    )
  ) {
    notFound();
  }

  const [allThemes, profile] = await Promise.all([
    listThemes(),
    getBusinessProfile(params.projectId).catch(() => null),
  ]);
  const industry = profile?.industry ?? undefined;
  const purposes = profile?.business_purpose ?? [];
  const themes = themesForProduct(allThemes, project.product_type ?? "LAND").sort(
    (a, b) =>
      themeScore(b, industry, purposes) - themeScore(a, industry, purposes) ||
      a.name.localeCompare(b.name),
  );
  const brief = profile ? summarizeBusiness(profile) : null;

  return (
    <div>
      <PageHeader
        title="Pilih Theme"
        description="Mulai dari satu theme, lalu pilih tipe, tier, dan varian yang tersedia."
      />
      {brief ? (
        <Card
          title="Rekomendasi AI"
          description="Ringkasan brief dan arah theme yang paling dekat."
          className="mb-4"
        >
          <p className="text-sm leading-relaxed text-ink">{brief.summary}</p>
          {themes[0] ? (
            <p className="mt-3 text-sm text-muted">
              Rekomendasi awal: <span className="font-medium text-ink">{themes[0].name}</span>
              {industry ? ` · industri ${industryLabel(industry)}` : ""}
              {purposes.length ? ` · tujuan ${purposeLabels(purposes)}` : ""}.
            </p>
          ) : null}
        </Card>
      ) : null}
      <ThemeCatalog
        themes={themes}
        mode="pick"
        projectId={params.projectId}
        initialTemplateCode={project.template_id}
        contextNote={`Direkomendasikan untuk ${productLabel(project.product_type)}${
          industry ? ` · industri ${industryLabel(industry)}` : ""
        }${purposes.length ? ` · tujuan ${purposeLabels(purposes)}` : ""}`}
      />
    </div>
  );
}
