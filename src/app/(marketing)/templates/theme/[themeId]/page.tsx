import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ThemeDetail } from "@/modules/catalog/components/theme-detail";
import { getTheme } from "@/shared/lib/catalog-server";
import { PageHeader } from "@/shared/ui";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: { themeId: string };
}): Promise<Metadata> {
  const theme = await getTheme(params.themeId).catch(() => null);
  if (!theme) return { title: "Theme tidak ditemukan — JiooDev" };
  return {
    title: `${theme.name} — JiooDev`,
    description: theme.description,
  };
}

export default async function ThemeDetailPage({
  params,
}: {
  params: { themeId: string };
}) {
  const theme = await getTheme(params.themeId).catch(() => null);
  if (!theme) notFound();

  return (
    <div className="mx-auto max-w-6xl px-5 py-14 lg:py-20">
      <PageHeader
        title={theme.name}
        description={theme.description}
        actions={
          <Link
            href="/templates"
            className="text-sm font-medium text-accent hover:underline"
          >
            Semua theme
          </Link>
        }
      />
      <ThemeDetail theme={theme} />
    </div>
  );
}
