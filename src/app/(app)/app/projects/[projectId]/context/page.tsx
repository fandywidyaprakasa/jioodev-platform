import { PageHeader, Card, Scaffold } from "@/shared/ui/page";

export default function Page({ params }: { params: { projectId: string } }) {
  return (
    <div>
      <PageHeader eyebrow="Project" title={`Business Context · ${params.projectId}`} description="Business Context untuk project." />
      <Card title="Status">
        <Scaffold items={["Form stepper","Auto-save"]} />
      </Card>
    </div>
  );
}
