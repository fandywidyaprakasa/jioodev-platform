import { PageHeader, Card, Scaffold } from "@/shared/ui/page";

export default function Page() {
  return (
    <div>
      <PageHeader eyebrow="Admin" title="Paket & Harga" description="Kelola paket." />
      <Card title="Status">
        <Scaffold items={["CRUD paket","Aktif/nonaktif"]} />
      </Card>
    </div>
  );
}
