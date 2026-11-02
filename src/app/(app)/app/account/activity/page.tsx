import { PageHeader, Card, Scaffold } from "@/shared/ui/page";

export default function Page() {
  return (
    <div>
      <PageHeader eyebrow="Akun" title="Aktivitas" description="Riwayat aksi." />
      <Card title="Status">
        <Scaffold items={["Timeline","Filter"]} />
      </Card>
    </div>
  );
}
