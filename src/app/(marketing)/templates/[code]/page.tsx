import { ArrowUpRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { TemplateDetailPreview } from "@/modules/catalog/client";
import { getTemplate } from "@/modules/catalog";
import {
  industryLabels,
  layoutLabel,
  productLabel,
  purposeLabels,
  styleLabel,
  tierLabel,
} from "@/shared/lib/taxonomy";
import { ALL_PRODUCT_TYPES } from "@/shared/types";
import { getTheme } from "@/modules/catalog";
import { Badge, PageHeader } from "@/shared/ui";

export const dynamic = "force-dynamic";

export async function generateMetadata(
  props: {
    params: Promise<{ code: string }>;
  }
): Promise<Metadata> {
  const params = await props.params;
  const template = await getTemplate(params.code, ALL_PRODUCT_TYPES);
  if (!template) return { title: "Template tidak ditemukan — JiooDev" };
  return {
    title: `${template.name} — JiooDev`,
    description: template.description,
  };
}

export default async function TemplateDetailPage(
  props: {
    params: Promise<{ code: string }>;
  }
) {
  const params = await props.params;
  const template = await getTemplate(params.code, ALL_PRODUCT_TYPES);
  if (!template) notFound();
  const theme = template.themeId
    ? await getTheme(template.themeId, ALL_PRODUCT_TYPES).catch(() => null)
    : null;

  return (
    <div className="mx-auto max-w-6xl px-5 py-14 lg:py-20">
      <PageHeader
        title={template.name}
        description={template.description}
        back={{
          href: theme ? `/templates/theme/${theme.themeId}` : "/templates",
          label: theme ? `Kembali ke ${theme.name}` : "Kembali ke katalog",
        }}
        actions={
          <>
            <Badge variant="accent">{productLabel(template.productType)}</Badge>
            {template.tier ? <Badge>{tierLabel(template.tier)}</Badge> : null}
            <Badge>{layoutLabel(template.layout)}</Badge>
            <Badge>{styleLabel(template.style)}</Badge>
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
                {industryLabels(template.industries) || "Umum"}
              </dd>
            </div>
            <div className="flex items-start justify-between gap-4 border-b border-line py-3.5">
              <dt className="text-muted">Tujuan</dt>
              <dd className="text-right text-ink">
                {purposeLabels(template.purposes) || "Umum"}
              </dd>
            </div>
          </dl>

          <div className="mt-6 space-y-3">
            <Link
              href={`/app/projects/new?template=${encodeURIComponent(template.code)}`}
              className="inline-flex min-h-12 w-full items-center justify-center rounded-full bg-accent px-5 text-sm font-medium text-on-accent transition-[background-color,border-color,color,transform] duration-150 active:scale-[0.96] hover:bg-accent-strong"
            >
              Gunakan template
            </Link>
            {template.previewUrl ? (
              <a
                href={template.previewUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-full border border-line px-5 text-sm font-medium text-ink transition-[background-color,border-color,color,transform] duration-150 active:scale-[0.96] hover:border-ink/40"
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
