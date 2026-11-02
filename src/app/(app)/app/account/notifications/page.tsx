import { PageHeader, Card, Scaffold } from "@/shared/ui/page";

export default function Page() {
  return (
    <div>
      <PageHeader eyebrow="Akun" title="Notifikasi" description="Event terbaru." />
      <Card title="Status">
        <Scaffold items={["Daftar notifikasi","Tandai dibaca"]} />
      </Card>
    </div>
  );
}
