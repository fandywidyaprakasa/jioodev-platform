import { PackageManager } from "@/modules/admin/components/package-manager";
import { api } from "@/shared/lib/api";
import { PageHeader } from "@/shared/ui";

export default async function AdminPackagesPage() {
  const packages = await api.admin.packages();

  return (
    <div>
      <PageHeader
        eyebrow="Admin"
        title="Paket & Harga"
        description="Kelola paket, harga, dan kuota deploy."
      />
      <PackageManager initial={packages} />
    </div>
  );
}
