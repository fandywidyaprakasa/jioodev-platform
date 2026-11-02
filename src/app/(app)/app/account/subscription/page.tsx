import { PageHeader, Card, Scaffold } from "@/shared/ui/page";

export default function Page() {
  return (
    <div>
      <PageHeader eyebrow="Akun" title="Paket & Kuota" description="Paket aktif dan sisa deploy." />
      <Card title="Status">
        <Scaffold items={["Paket","Kuota","Perpanjangan"]} />
      </Card>
    </div>
  );
}
