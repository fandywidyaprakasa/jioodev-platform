import { PageHeader, Card, Scaffold } from "@/shared/ui/page";

export default function Page({ params }: { params: { projectId: string } }) {
  return (
    <div>
      <PageHeader eyebrow="Project" title={`Generate · ${params.projectId}`} description="Generate untuk project." />
      <Card title="Status">
        <Scaffold items={["Progress","Estimasi"]} />
      </Card>
    </div>
  );
}
