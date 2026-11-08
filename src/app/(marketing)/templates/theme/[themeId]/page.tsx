import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ThemeDetail } from "@/modules/catalog/client";
import { getTheme } from "@/modules/catalog";
import { ALL_PRODUCT_TYPES } from "@/shared/types";
import { PageHeader } from "@/shared/ui";

export const dynamic = "force-dynamic";

export async function generateMetadata(
  props: {
    params: Promise<{ themeId: string }>;
  }
): Promise<Metadata> {
  const params = await props.params;
  const theme = await getTheme(params.themeId, ALL_PRODUCT_TYPES).catch(() => null);
  if (!theme) return { title: "Theme tidak ditemukan — JiooDev" };
  return {
    title: `${theme.name} — JiooDev`,
    description: theme.description,
  };
}

export default async function ThemeDetailPage(
  props: {
    params: Promise<{ themeId: string }>;
  }
) {
  const params = await props.params;
  const theme = await getTheme(params.themeId, ALL_PRODUCT_TYPES).catch(() => null);
  if (!theme) notFound();

  return (
    <div className="mx-auto max-w-6xl px-5 py-14 lg:py-20">
      <PageHeader
        title={theme.name}
        description={theme.description}
        back={{ href: "/templates", label: "Kembali ke katalog" }}
      />
      <ThemeDetail theme={theme} />
    </div>
  );
}
