import { PageHeader, Card, Scaffold } from "@/shared/ui/page";

export default function Page() {
  return (
    <div>
      <PageHeader eyebrow="Akun" title="Profil & Pengaturan" description="Kelola akun Anda." />
      <Card title="Status">
        <Scaffold items={["Profil","Preferensi","Tema"]} />
      </Card>
    </div>
  );
}
