import { notFound } from "next/navigation";
import { DeployPanel } from "@/modules/publishing/client";
import { dateTimeID } from "@/shared/lib/format";
import { productLabel } from "@/shared/lib/taxonomy";
import { findProject, toProject } from "@/modules/projects";
import { Card, PageHeader, StatusBadge } from "@/shared/ui";

export const dynamic = "force-dynamic";

export default async function AdminProjectDetailPage(
  props: {
    params: Promise<{ projectId: string }>;
  }
) {
  const params = await props.params;
  const record = await findProject(params.projectId).catch(() => null);
  if (!record) notFound();
  const project = toProject(record);

  return (
    <div className="space-y-6">
      <PageHeader
        title={project.clientLabel}
        description={`${productLabel(project.productType)} · ${dateTimeID(project.createdAt)}`}
        actions={<StatusBadge status={project.status} />}
      />
      <Card title="Ringkasan">
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div className="flex justify-between gap-3">
            <dt className="text-muted">Business</dt>
            <dd className="text-ink">{project.businessName ?? "—"}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-muted">Template</dt>
            <dd className="text-ink">{project.templateCode ?? "—"}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-muted">Preview</dt>
            <dd className="text-ink">{project.previewUrl ?? "—"}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-muted">Domain</dt>
            <dd className="text-ink">{project.domain ?? "—"}</dd>
          </div>
        </dl>
      </Card>
      <DeployPanel projectId={project.id} />
    </div>
  );
}
