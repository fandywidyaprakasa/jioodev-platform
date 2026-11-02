import { notFound } from "next/navigation";
import { DeployPanel } from "@/modules/admin/components/deploy-panel";
import { api } from "@/shared/lib/api";
import { dateTimeID } from "@/shared/lib/format";
import { Card, PageHeader, StatusBadge } from "@/shared/ui";

export default async function AdminProjectDetailPage({
  params,
}: {
  params: { projectId: string };
}) {
  const project = await api.projects.get(params.projectId);
  if (!project) notFound();

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Admin"
        title={project.clientLabel}
        description={`${project.productType} · ${dateTimeID(project.createdAt)}`}
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
