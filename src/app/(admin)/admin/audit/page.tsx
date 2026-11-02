import { PageHeader, Card, Scaffold } from "@/shared/ui/page";

export default function Page() {
  return (
    <div>
      <PageHeader eyebrow="Admin" title="Audit Log" description="Riwayat aksi admin." />
      <Card title="Status">
        <Scaffold items={["Timeline","Filter"]} />
      </Card>
    </div>
  );
}
