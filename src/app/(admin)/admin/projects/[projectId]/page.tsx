import { PageHeader, Card, Scaffold } from "@/shared/ui/page";

export default function Page({ params }: { params: { projectId: string } }) {
  return (
    <div>
      <PageHeader eyebrow="Admin" title={`Project · ${params.projectId}`} description="Detail & deploy." />
      <Card title="Status">
        <Scaffold items={["Status","Deploy trigger"]} />
      </Card>
    </div>
  );
}
