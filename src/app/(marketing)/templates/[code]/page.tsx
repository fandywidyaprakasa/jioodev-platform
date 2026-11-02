import Link from "next/link";
import { notFound } from "next/navigation";
import { api } from "@/shared/lib/api";
import { Badge, Card, PageHeader } from "@/shared/ui";

export default async function TemplateDetailPage({
  params,
}: {
  params: { code: string };
}) {
  const template = await api.templates.get(params.code);
  if (!template) notFound();

  return (
    <div>
      <PageHeader
        eyebrow="Template"
        title={template.name}
        description={template.description}
        actions={
          <>
            <Badge variant="accent">{template.productType}</Badge>
            <Badge>{template.layout}</Badge>
            <Badge>{template.style}</Badge>
          </>
        }
      />
      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <div className="flex aspect-[4/3] items-end rounded-lg border border-line bg-gradient-to-br from-accent-soft via-paper to-line p-6">
          <p className="font-display text-2xl text-ink">{template.name}</p>
        </div>
        <Card title="Detail">
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-muted">Kode</dt>
              <dd className="text-ink">{template.code}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted">Industri</dt>
              <dd className="text-right text-ink">{template.industries.join(", ")}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted">Tujuan</dt>
              <dd className="text-right text-ink">{template.purposes.join(", ")}</dd>
            </div>
          </dl>
          <Link
            href="/register"
            className="mt-5 inline-flex rounded-full bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-strong"
          >
            Gunakan Template
          </Link>
        </Card>
      </div>
    </div>
  );
}
