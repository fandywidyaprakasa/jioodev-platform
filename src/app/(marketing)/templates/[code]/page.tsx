import { ArrowUpRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { TemplateDetailPreview } from "@/modules/catalog/components/template-detail-preview";
import { getTemplate } from "@/shared/lib/templates-server";
import { getTheme } from "@/shared/lib/catalog-server";
import { Badge, PageHeader } from "@/shared/ui";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: { code: string };
}): Promise<Metadata> {
  const template = await getTemplate(params.code);
  if (!template) return { title: "Template tidak ditemukan — JiooDev" };
  return {
    title: `${template.name} — JiooDev`,
    description: template.description,
  };
}

export default async function TemplateDetailPage({
  params,
}: {
  params: { code: string };
}) {
  const template = await getTemplate(params.code);
  if (!template) notFound();
  const theme = template.themeId
    ? await getTheme(template.themeId).catch(() => null)
    : null;

  return (
    <div className="mx-auto max-w-6xl px-5 py-14 lg:py-20">
      <PageHeader
        title={template.name}
        description={template.description}
        actions={
          <>
            {theme ? (
              <Link
                href={`/templates/theme/${theme.themeId}`}
                className="text-sm font-medium text-accent hover:underline"
              >
                {theme.name}
              </Link>
            ) : null}
            <Badge variant="accent">{template.productType}</Badge>
            {template.tier ? <Badge>{template.tier}</Badge> : null}
            <Badge>{template.layout}</Badge>
            <Badge>{template.style}</Badge>
          </>
        }
      />

      <div className="grid gap-8 lg:grid-cols-[1.35fr_0.65fr] lg:gap-12">
        <TemplateDetailPreview code={template.code} />

        <aside className="lg:pt-2">
          <dl className="border-t border-line text-sm">
            <div className="flex items-start justify-between gap-4 border-b border-line py-3.5">
              <dt className="text-muted">Kode</dt>
              <dd className="font-mono text-xs text-ink">{template.code}</dd>
            </div>
            <div className="flex items-start justify-between gap-4 border-b border-line py-3.5">
              <dt className="text-muted">Industri</dt>
              <dd className="text-right text-ink">
                {template.industries.join(", ") || "Umum"}
              </dd>
            </div>
            <div className="flex items-start justify-between gap-4 border-b border-line py-3.5">
              <dt className="text-muted">Tujuan</dt>
              <dd className="text-right text-ink">
                {template.purposes.join(", ") || "General"}
              </dd>
            </div>
          </dl>

          <div className="mt-6 space-y-3">
            <Link
              href="/register"
              className="inline-flex min-h-12 w-full items-center justify-center rounded-full bg-accent px-5 text-sm font-medium text-on-accent transition-colors duration-150 hover:bg-accent-strong"
            >
              Gunakan template
            </Link>
            {template.previewUrl ? (
              <a
                href={template.previewUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-full border border-line px-5 text-sm font-medium text-ink transition-colors duration-150 hover:border-ink/40"
              >
                Buka preview
                <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
              </a>
            ) : null}
            <Link
              href="/templates"
              className="block pt-1 text-center text-sm font-medium text-accent hover:underline"
            >
              Kembali ke katalog
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
