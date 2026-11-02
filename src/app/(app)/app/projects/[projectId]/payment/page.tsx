import { PageHeader, Card, Scaffold } from "@/shared/ui/page";

export default function Page({ params }: { params: { projectId: string } }) {
  return (
    <div>
      <PageHeader eyebrow="Project" title={`Pembayaran · ${params.projectId}`} description="Pembayaran untuk project." />
      <Card title="Status">
        <Scaffold items={["QRIS","Status"]} />
      </Card>
    </div>
  );
}
