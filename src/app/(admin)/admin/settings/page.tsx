import { PageHeader, Card, Scaffold } from "@/shared/ui/page";

export default function Page() {
  return (
    <div>
      <PageHeader eyebrow="Admin" title="Pengaturan Global" description="Konfigurasi platform." />
      <Card title="Status">
        <Scaffold items={["Feature toggle","Integrasi"]} />
      </Card>
    </div>
  );
}
