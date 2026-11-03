import { ArrowRight, Check } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { currentUser } from "@/shared/lib/server-auth";
import { canAccess, findProject, toProject } from "@/shared/lib/projects-server";
import { dateTimeID } from "@/shared/lib/format";
import { Card, PageHeader, StatusBadge } from "@/shared/ui";

const STEPS = [
  { label: "Context", slug: "context", rank: 0 },
  { label: "Comprehend", slug: "comprehend", rank: 1 },
  { label: "Template", slug: "templates", rank: 2 },
  { label: "Generate", slug: "generate", rank: 3 },
  { label: "Preview", slug: "preview", rank: 4 },
  { label: "Customize", slug: "customize", rank: 5 },
  { label: "Payment", slug: "payment", rank: 6 },
  { label: "Deploy", slug: "deploy", rank: 7 },
];

const STATUS_RANK: Record<string, number> = {
  DRAFT: 0,
  INTAKE: 0,
  COMPREHENDED: 1,
  TEMPLATE_CHOSEN: 2,
  GENERATING: 3,
  PREVIEWS: 4,
  PICKED: 5,
  PAID: 6,
  DEPLOYED: 7,
  ACTIVE: 7,
};

const NEXT_ACTION: Record<string, { label: string; href: string }> = {
  DRAFT: { label: "Isi business context", href: "context" },
  INTAKE: { label: "Isi business context", href: "context" },
  COMPREHENDED: { label: "Pilih template", href: "templates" },
  TEMPLATE_CHOSEN: { label: "Generate varian", href: "generate" },
  GENERATING: { label: "Lihat progress", href: "generate" },
  PREVIEWS: { label: "Tinjau preview", href: "preview" },
  PICKED: { label: "Lanjut pembayaran", href: "payment" },
  PAID: { label: "Status deploy", href: "deploy" },
  DEPLOYED: { label: "Buka preview", href: "preview" },
  ACTIVE: { label: "Buka preview", href: "preview" },
};

export default async function ProjectDetailPage({
  params,
}: {
  params: { projectId: string };
}) {
  const user = await currentUser();
  const record = user ? await findProject(params.projectId) : null;
  if (
    !record ||
    !user ||
    !canAccess(
      record,
      user.role === "guest" ? undefined : user.id,
      user.role === "admin",
      user.guestId,
    )
  ) {
    notFound();
  }
  const project = toProject(record);
  const next = NEXT_ACTION[project.status] ?? NEXT_ACTION.DRAFT;
  const currentRank = STATUS_RANK[project.status] ?? 0;

  return (
    <div>
      <PageHeader
        title={project.clientLabel}
        description={`${project.productType} · dibuat ${dateTimeID(project.createdAt)}`}
        actions={<StatusBadge status={project.status} />}
      />

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Card title="Alur produksi" description="Setiap langkah menyimpan keputusan sebelumnya.">
          <ol className="space-y-1">
            {STEPS.map((step, index) => {
              const done = step.rank < currentRank;
              const current = step.rank === currentRank;
              return (
                <li key={step.slug}>
                  <Link
                    href={`/app/projects/${project.id}/${step.slug}`}
                    aria-current={current ? "step" : undefined}
                    className={`flex min-h-12 items-center gap-3 rounded-md px-3 text-sm transition-colors duration-150 ${
                      current
                        ? "bg-accent-soft text-accent"
                        : "text-muted hover:bg-paper hover:text-ink"
                    }`}
                  >
                    <span
                      className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border font-mono text-[10px] ${
                        done
                          ? "border-success/30 bg-success/10 text-success"
                          : current
                            ? "border-accent/40 bg-surface text-accent"
                            : "border-line text-muted"
                      }`}
                    >
                      {done ? (
                        <Check className="h-3 w-3" aria-hidden="true" />
                      ) : (
                        String(index + 1).padStart(2, "0")
                      )}
                    </span>
                    <span className={`flex-1 ${current ? "font-semibold" : "font-medium"}`}>
                      {step.label}
                    </span>
                    <span className="text-xs">
                      {current ? "Sekarang" : done ? "Selesai" : "Buka"}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ol>
        </Card>

        <div className="space-y-4">
          <Card title="Langkah berikutnya">
            <p className="text-sm leading-relaxed text-muted">
              Status saat ini{" "}
              <span className="font-medium text-ink">{project.status}</span>. Lanjutkan
              alur tanpa kehilangan konteks yang sudah tersimpan.
            </p>
            <Link
              href={`/app/projects/${project.id}/${next.href}`}
              className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-full bg-accent px-5 text-sm font-medium text-on-accent transition-colors duration-150 hover:bg-accent-strong"
            >
              {next.label}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </Card>

          <Card title="Ringkasan">
            <dl className="divide-y divide-line text-sm">
              <div className="flex justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                <dt className="text-muted">Business</dt>
                <dd className="text-right text-ink">
                  {project.businessName ?? "—"}
                </dd>
              </div>
              <div className="flex justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                <dt className="text-muted">Template</dt>
                <dd className="text-right font-mono text-xs text-ink">
                  {project.templateCode ?? "Belum dipilih"}
                </dd>
              </div>
              <div className="flex justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                <dt className="text-muted">Preview</dt>
                <dd className="text-right text-ink">
                  {project.previewUrl ? "Tersedia" : "Belum ada"}
                </dd>
              </div>
              <div className="flex justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                <dt className="text-muted">Domain</dt>
                <dd className="text-right text-ink">
                  {project.domain ?? "Belum ada"}
                </dd>
              </div>
            </dl>
          </Card>
        </div>
      </div>
    </div>
  );
}
