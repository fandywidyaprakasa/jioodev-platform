import { PageHeader, Card, Scaffold } from "@/shared/ui/page";

export default function Page() {
  return (
    <div>
      <PageHeader eyebrow="Project" title="Daftar Project" description="Semua project Anda." />
      <Card title="Status">
        <Scaffold items={["Filter status","Buat project","Detail"]} />
      </Card>
    </div>
  );
}
