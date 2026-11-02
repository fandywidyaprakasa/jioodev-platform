import { PageHeader, Card, Scaffold } from "@/shared/ui/page";

export default function Page({ params }: { params: { projectId: string } }) {
  return (
    <div>
      <PageHeader eyebrow="Project" title={`Konfirmasi Pemahaman · ${params.projectId}`} description="Konfirmasi Pemahaman untuk project." />
      <Card title="Status">
        <Scaffold items={["Ringkasan AI","Koreksi"]} />
      </Card>
    </div>
  );
}
