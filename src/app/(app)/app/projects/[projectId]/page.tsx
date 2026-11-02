import { PageHeader, Card, Scaffold } from "@/shared/ui/page";

export default function Page({ params }: { params: { projectId: string } }) {
  return (
    <div>
      <PageHeader eyebrow="Project" title={`Project · ${params.projectId}`} description="Detail & status alur." />
      <Card title="Status">
        <Scaffold items={["State","Preview","Deploy"]} />
      </Card>
    </div>
  );
}
