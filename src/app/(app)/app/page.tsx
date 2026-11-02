import { PageHeader, Card, Scaffold } from "@/shared/ui/page";

export default function Page() {
  return (
    <div>
      <PageHeader eyebrow="Workspace" title="Dashboard" description="Ringkasan project, kuota, tagihan." />
      <Card title="Status">
        <Scaffold items={["Project aktif","Kuota","Tagihan pending"]} />
      </Card>
    </div>
  );
}
