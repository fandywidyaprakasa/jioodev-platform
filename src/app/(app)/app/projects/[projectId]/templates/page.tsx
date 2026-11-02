import { PageHeader, Card, Scaffold } from "@/shared/ui/page";

export default function Page({ params }: { params: { projectId: string } }) {
  return (
    <div>
      <PageHeader eyebrow="Project" title={`Pilih Template · ${params.projectId}`} description="Pilih Template untuk project." />
      <Card title="Status">
        <Scaffold items={["Filter","Preview"]} />
      </Card>
    </div>
  );
}
