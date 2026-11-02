import { PageHeader, Card, Scaffold } from "@/shared/ui/page";

export default function Page() {
  return (
    <div>
      <PageHeader eyebrow="Katalog" title="Template" description="Jelajahi Design Foundation." />
      <Card title="Status">
        <Scaffold items={["Filter tipe/industri","Preview","Detail"]} />
      </Card>
    </div>
  );
}
