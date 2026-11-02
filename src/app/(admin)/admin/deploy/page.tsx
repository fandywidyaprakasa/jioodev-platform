import { PageHeader, Card, Scaffold } from "@/shared/ui/page";

export default function Page() {
  return (
    <div>
      <PageHeader eyebrow="Admin" title="Deploy" description="Antrian deploy & health." />
      <Card title="Status">
        <Scaffold items={["Antrian","Health","Rollback"]} />
      </Card>
    </div>
  );
}
