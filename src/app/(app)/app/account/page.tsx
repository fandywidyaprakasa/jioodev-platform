import { AccountForm } from "@/modules/account/components/account-form";
import { ThemeToggle } from "@/modules/account/components/theme-toggle";
import { getAccountProfile } from "@/shared/lib/account-server";
import { currentUser } from "@/shared/lib/server-auth";
import { Card, PageHeader } from "@/shared/ui";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const user = await currentUser();
  const profile =
    user && user.role !== "guest"
      ? await getAccountProfile(user.id).catch(() => null)
      : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Profil & Pengaturan"
        description="Kelola profil, preferensi tampilan, dan keamanan."
      />
      <AccountForm
        initial={{
          name: profile?.name ?? user?.email?.split("@")[0] ?? "",
          email: user?.email ?? "",
          phone: profile?.phone ?? "",
          company: profile?.company ?? "",
        }}
      />
      <Card title="Tampilan" description="Pilih tema terang atau gelap.">
        <ThemeToggle />
      </Card>
      <Card title="Keamanan">
        <p className="text-sm text-muted">
          Login memakai Google OAuth. Sesi dikelola NextAuth dan dapat diakhiri dari tombol keluar.
        </p>
      </Card>
    </div>
  );
}
