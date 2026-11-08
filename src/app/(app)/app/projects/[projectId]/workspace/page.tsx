import { notFound } from "next/navigation";
import Link from "next/link";
import { WorkspaceCanvas } from "@/modules/workspace/client";
import { renderComposition } from "@/modules/workspace";
import { canAccess, findProject } from "@/modules/projects";
import { loadProjectSite } from "@/modules/projects";
import { currentUser } from "@/modules/auth";

export const dynamic = "force-dynamic";

export default async function ProjectWorkspacePage(
  props: {
    params: Promise<{ projectId: string }>;
    searchParams?: Promise<{ page?: string }>;
  }
) {
  const searchParams = await props.searchParams;
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

  const site = await loadProjectSite(
    params.projectId,
    searchParams?.page,
  ).catch(() => null);
  if (!site) notFound();
  const rendered = await renderComposition(site.compositionId, {
    themeId: site.themeId,
    tier: site.tier,
    blocks: site.composition.blocks,
    content: site.content,
  }).catch(() => null);
  if (!rendered) notFound();

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 items-center gap-3 border-b border-line px-4 py-2">
        <Link
          href={`/app/projects/${params.projectId}`}
          className="text-sm text-muted transition-colors duration-150 hover:text-ink"
        >
          ← Project
        </Link>
        <span className="h-4 w-px bg-line" aria-hidden="true" />
        <h1 className="text-sm font-semibold text-ink">Workspace</h1>
        <p className="ml-auto truncate text-xs text-muted">
          Edit halaman website secara visual, lalu simpan perubahan.
        </p>
      </div>
      <div className="min-h-0 flex-1">
        <WorkspaceCanvas
          key={`${site.page.id}:${JSON.stringify(site.siteSettings)}`}
          id={site.compositionId}
          projectId={params.projectId}
          pageId={site.page.id}
          pages={site.pages.map((page) => ({
            id: page.id,
            title: page.title,
            slug: page.slug,
            isHome: page.is_home,
            order: page.order,
            seo: page.seo,
            settings: page.settings,
          }))}
          siteSettings={site.siteSettings}
          data={site}
          assets={site.assets}
          initialHtml={rendered.html}
        />
      </div>
    </div>
  );
}
