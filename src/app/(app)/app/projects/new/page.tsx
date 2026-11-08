import { NewProjectForm } from "@/modules/projects/client";
import { getTemplate } from "@/modules/catalog";
import { ALL_PRODUCT_TYPES } from "@/shared/types";
import { PageHeader } from "@/shared/ui";

export const dynamic = "force-dynamic";

export default async function NewProjectPage(
  props: {
    searchParams?: Promise<{ template?: string }>;
  }
) {
  const searchParams = await props.searchParams;
  const code = searchParams?.template?.trim();
  const template = code
    ? await getTemplate(code, ALL_PRODUCT_TYPES).catch(() => null)
    : null;

  return (
    <div>
      <PageHeader
        title="Buat Project"
        description={
          template
            ? "Template sudah dipilih. Lengkapi konteks bisnis untuk memulai."
            : "Pilih tipe produk untuk memulai alur."
        }
      />
      <NewProjectForm
        initialTemplate={
          template ? { code: template.code, name: template.name } : null
        }
      />
    </div>
  );
}
