import { notFound } from "next/navigation";
import { renderComposition } from "@/shared/lib/composition-render";
import { loadWorkspace } from "@/shared/lib/workspace-server";
import { WorkspaceCanvas } from "@/modules/workspace/components/workspace-canvas";
import { PageHeader } from "@/shared/ui";

export const dynamic = "force-dynamic";

export default async function WorkspacePage({
  params,
}: {
  params: { id: string };
}) {
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
    <div>
      <PageHeader
        title="Workspace"
        description="Susun slot, ganti varian, dan edit konten tanpa menyentuh HTML."
      />
      <WorkspaceCanvas id={params.id} data={data} initialHtml={rendered.html} />
    </div>
  );
}
