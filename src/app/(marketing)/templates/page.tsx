import type { Metadata } from "next";
import { TemplateGrid } from "@/modules/catalog/components/template-grid";
import { listTemplates } from "@/shared/lib/templates-server";
import { PageHeader } from "@/shared/ui";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Katalog Template — JiooDev",
  description:
    "Jelajahi fondasi desain JiooDev untuk landing page, website, dan commerce.",
};

export default async function TemplatesPage() {
  const templates = await listTemplates();

  return (
    <div className="mx-auto max-w-6xl px-5 py-14 lg:py-20">
      <PageHeader
        title="Fondasi desain, bukan tema instan."
        description={`${templates.length} template terkurasi dengan struktur section yang bisa ditransformasi sesuai konteks bisnis.`}
      />
      <TemplateGrid templates={templates} hrefBase="/templates" />
    </div>
  );
}
