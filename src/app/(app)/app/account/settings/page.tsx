import { PageHeader, Card, Scaffold } from "@/shared/ui/page";

export default function Page() {
  return (
    <div>
      <PageHeader eyebrow="Akun" title="Pengaturan" description="Notifikasi & tampilan." />
      <Card title="Status">
        <Scaffold items={["Notifikasi","Tema","Keamanan"]} />
      </Card>
    </div>
  );
}
