import { PageHeader, Card, Scaffold } from "@/shared/ui/page";

export default function Page({ params }: { params: { code: string } }) {
  return (
    <div>
      <PageHeader eyebrow="Template" title={`Template · ${params.code}`} description="Detail template." />
      <Card title="Status">
        <Scaffold items={["Metadata","Preview","Gunakan"]} />
      </Card>
    </div>
  );
}
