import { ArrowRight, Check } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { currentUser } from "@/modules/auth";
import { canAccess, findProject, toProject } from "@/modules/projects";
import { dateTimeID } from "@/shared/lib/format";
import { productLabel } from "@/shared/lib/taxonomy";
import { Card, PageHeader, StatusBadge } from "@/shared/ui";

const STEPS = [
  { label: "Business Brief", slug: "context", rank: 0 },
  { label: "Pilih Template", slug: "templates", rank: 1 },
  { label: "Preview", slug: "preview", rank: 2 },
  { label: "Customize", slug: "customize", rank: 3 },
  { label: "Pembayaran", slug: "payment", rank: 4 },
  { label: "Publish", slug: "deploy", rank: 5 },
];

const STATUS_RANK: Record<string, number> = {
  DRAFT: 0,
  INTAKE: 0,
  COMPREHENDED: 1,
  TEMPLATE_CHOSEN: 1,
  GENERATING: 2,
  PREVIEWS: 2,
  PICKED: 3,
  PAID: 5,
  DEPLOYED: 6,
  ACTIVE: 6,
};

const NEXT_ACTION: Record<string, { label: string; href: string }> = {
  DRAFT: { label: "Isi business brief", href: "context" },
  INTAKE: { label: "Isi business brief", href: "context" },
  COMPREHENDED: { label: "Pilih template", href: "templates" },
  TEMPLATE_CHOSEN: { label: "Lihat preview", href: "preview" },
  GENERATING: { label: "Lihat progress", href: "preview" },
  PREVIEWS: { label: "Tinjau preview", href: "preview" },
  PICKED: { label: "Customize halaman", href: "customize" },
  PAID: { label: "Publish halaman", href: "deploy" },
  DEPLOYED: { label: "Buka halaman", href: "preview" },
  ACTIVE: { label: "Buka halaman", href: "preview" },
};

export default async function ProjectDetailPage(
  props: {
    params: Promise<{ projectId: string }>;
  }
) {
  const params = await props.params;
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
  const nextAction =
    (project.status === "DEPLOYED" || project.status === "ACTIVE") && project.previewUrl
      ? { label: "Buka halaman", href: project.previewUrl }
      : next;
  const templateReady = Boolean(project.templateCode);
  const currentRank =
    project.status === "TEMPLATE_CHOSEN" && templateReady
      ? Math.max(STATUS_RANK[project.status] ?? 0, 2)
      : (STATUS_RANK[project.status] ?? 0);

  return (
    <div>
      <PageHeader
        title={project.clientLabel}
        description={`${productLabel(project.productType)} · dibuat ${dateTimeID(project.createdAt)}`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={project.status} />
            <Link
              href={`/app/projects/${project.id}/workspace`}
              className="rounded-full border border-line px-4 py-2 text-sm font-medium text-ink hover:border-ink/40"
            >
              Buka Workspace
            </Link>
          </div>
        }
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
              href={nextAction.href.startsWith("/") ? nextAction.href : `/app/projects/${project.id}/${nextAction.href}`}
              className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-full bg-accent px-5 text-sm font-medium text-on-accent transition-[background-color,border-color,color,transform] duration-150 active:scale-[0.96] hover:bg-accent-strong"
            >
              {nextAction.label}
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
                  {project.previewUrl ? (
                    <a
                      href={project.previewUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="font-medium text-accent hover:underline"
                    >
                      Buka halaman
                    </a>
                  ) : (
                    "Belum ada"
                  )}
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
