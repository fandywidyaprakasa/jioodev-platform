import { notFound } from "next/navigation";
import { ThemeCatalog } from "@/modules/catalog/components/theme-catalog";
import {
  listThemes,
  themeScore,
  themesForProduct,
} from "@/shared/lib/catalog-server";
import {
  canAccess,
  findProject,
  getBusinessProfile,
} from "@/shared/lib/projects-server";
import { currentUser } from "@/shared/lib/server-auth";
import { PageHeader } from "@/shared/ui";

export const dynamic = "force-dynamic";

export default async function ProjectTemplatesPage({
  params,
}: {
  params: { projectId: string };
}) {
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

  return (
    <div>
      <PageHeader
        title="Pilih Theme"
        description="Mulai dari satu theme, lalu pilih tipe, tier, dan varian yang tersedia."
      />
      <ThemeCatalog
        themes={themes}
        mode="pick"
        projectId={params.projectId}
        contextNote={`Direkomendasikan untuk ${project.product_type}${
          industry ? ` · industri ${industry}` : ""
        }${purposes.length ? ` · tujuan ${purposes.join(", ")}` : ""}`}
      />
    </div>
  );
}
