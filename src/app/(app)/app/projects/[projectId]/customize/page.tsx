import { PageHeader, Card, Scaffold } from "@/shared/ui/page";

export default function Page({ params }: { params: { projectId: string } }) {
  return (
    <div>
      <PageHeader eyebrow="Project" title={`Customize · ${params.projectId}`} description="Customize untuk project." />
      <Card title="Status">
        <Scaffold items={["Section toggle","Copy override"]} />
      </Card>
    </div>
  );
}
