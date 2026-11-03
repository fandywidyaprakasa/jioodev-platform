import { PackageManager } from "@/modules/admin/components/package-manager";
import { listPackages } from "@/shared/lib/admin-server";
import { PageHeader } from "@/shared/ui";

export const dynamic = "force-dynamic";

export default async function AdminPackagesPage() {
  const initial = await listPackages().catch(() => []);

  return (
    <div>
      <PageHeader
        title="Paket & Harga"
        description="Kelola paket, harga, dan kuota deploy."
      />
      <PackageManager initial={initial} />
    </div>
  );
}
