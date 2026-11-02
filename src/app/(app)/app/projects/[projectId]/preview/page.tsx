import { PageHeader, Card, Scaffold } from "@/shared/ui/page";

export default function Page({ params }: { params: { projectId: string } }) {
  return (
    <div>
      <PageHeader eyebrow="Project" title={`Preview · ${params.projectId}`} description="Preview untuk project." />
      <Card title="Status">
        <Scaffold items={["Two-axis","Device toggle"]} />
      </Card>
    </div>
  );
}
