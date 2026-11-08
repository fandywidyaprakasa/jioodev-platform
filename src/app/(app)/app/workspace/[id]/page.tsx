import { notFound, redirect } from "next/navigation";
import { renderComposition } from "@/modules/workspace";
import { loadWorkspace } from "@/modules/workspace";
import { WorkspaceCanvas } from "@/modules/workspace/client";
import { currentUser } from "@/modules/auth";

export const dynamic = "force-dynamic";

export default async function WorkspacePage(
  props: {
    params: Promise<{ id: string }>;
  }
) {
  const params = await props.params;
  const user = await currentUser();
  if (!user) redirect(`/login?next=/app/workspace/${params.id}`);
  if (user.role !== "admin") redirect("/app/projects");

  const data = await loadWorkspace(params.id);
  if (!data) notFound();

  const rendered = await renderComposition(params.id, {
    themeId: data.composition.theme_id,
    tier: data.composition.tier,
    blocks: data.composition.blocks,
    content: data.content,
  }).catch(() => null);

  if (!rendered) notFound();

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 items-center gap-3 border-b border-line px-4 py-2">
        <h1 className="text-sm font-semibold text-ink">Workspace</h1>
        <p className="ml-auto truncate text-xs text-muted">
          Susun slot, ganti varian, dan edit konten tanpa menyentuh HTML.
        </p>
      </div>
      <div className="min-h-0 flex-1">
        <WorkspaceCanvas id={params.id} data={data} initialHtml={rendered.html} />
      </div>
    </div>
  );
}
