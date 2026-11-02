import Link from "next/link";
import { notFound } from "next/navigation";
import { currentUser } from "@/shared/lib/server-auth";
import { canAccess, findProject, toProject } from "@/shared/lib/projects-server";
import { dateTimeID } from "@/shared/lib/format";
import { Card, PageHeader, StatusBadge } from "@/shared/ui";

const STEPS = [
  ["Context", "context"],
  ["Comprehend", "comprehend"],
  ["Template", "templates"],
  ["Generate", "generate"],
  ["Preview", "preview"],
  ["Customize", "customize"],
  ["Payment", "payment"],
  ["Deploy", "deploy"],
];

const NEXT_ACTION: Record<string, { label: string; href: string }> = {
  DRAFT: { label: "Isi Business Context", href: "context" },
  INTAKE: { label: "Isi Business Context", href: "context" },
  COMPREHENDED: { label: "Pilih Template", href: "templates" },
  TEMPLATE_CHOSEN: { label: "Generate Varian", href: "generate" },
  GENERATING: { label: "Lihat Progress", href: "generate" },
  PREVIEWS: { label: "Tinjau Preview", href: "preview" },
  PICKED: { label: "Lanjut Pembayaran", href: "payment" },
  PAID: { label: "Status Deploy", href: "deploy" },
  DEPLOYED: { label: "Buka Preview", href: "preview" },
  ACTIVE: { label: "Buka Preview", href: "preview" },
};

export default async function ProjectDetailPage({
  params,
}: {
  params: { projectId: string };
}) {
  const user = await currentUser();
  const record = user ? await findProject(params.projectId) : null;
  if (!record || !user || !canAccess(record, user.id, user.role === "admin")) notFound();
  const project = toProject(record);

  const next = NEXT_ACTION[project.status] ?? NEXT_ACTION.DRAFT;

  return (
    <div>
      <PageHeader
        eyebrow="Project"
        title={project.clientLabel}
        description={`${project.productType} · dibuat ${dateTimeID(project.createdAt)}`}
        actions={<StatusBadge status={project.status} />}
      />

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Card title="Alur produksi" description="Langkah dapat dibuka ulang tanpa kehilangan data.">
          <ol className="space-y-2">
            {STEPS.map(([label, slug], index) => (
              <li key={slug}>
                <Link
                  href={`/app/projects/${project.id}/${slug}`}
                  className="flex items-center justify-between rounded-md border border-line px-3 py-2 text-sm hover:border-accent"
                >
                  <span>
                    <span className="mr-2 text-xs text-muted">{String(index + 1).padStart(2, "0")}</span>
                    <span className="font-medium text-ink">{label}</span>
                  </span>
                  <span className="text-xs text-accent">Buka</span>
                </Link>
              </li>
            ))}
          </ol>
        </Card>

        <div className="space-y-4">
          <Card title="Langkah berikutnya">
            <p className="text-sm text-muted">Status saat ini: {project.status}.</p>
            <Link
              href={`/app/projects/${project.id}/${next.href}`}
              className="mt-3 inline-flex rounded-full bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-strong"
            >
              {next.label}
            </Link>
          </Card>
          <Card title="Ringkasan">
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-muted">Business</dt>
                <dd className="text-right text-ink">{project.businessName ?? "—"}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted">Template</dt>
                <dd className="text-right text-ink">{project.templateCode ?? "Belum dipilih"}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted">Preview</dt>
                <dd className="text-right text-ink">{project.previewUrl ? "Tersedia" : "Belum ada"}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted">Domain</dt>
                <dd className="text-right text-ink">{project.domain ?? "Belum ada"}</dd>
              </div>
            </dl>
          </Card>
        </div>
      </div>
    </div>
  );
}
