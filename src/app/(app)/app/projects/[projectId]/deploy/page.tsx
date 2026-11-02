import { PageHeader, Card, Scaffold } from "@/shared/ui/page";

export default function Page({ params }: { params: { projectId: string } }) {
  return (
    <div>
      <PageHeader eyebrow="Project" title={`Deploy · ${params.projectId}`} description="Deploy untuk project." />
      <Card title="Status">
        <Scaffold items={["Status","Domain"]} />
      </Card>
    </div>
  );
}
