import { PageHeader, Card, Scaffold } from "@/shared/ui/page";

export default function Page() {
  return (
    <div>
      <PageHeader eyebrow="Admin" title="Semua Project" description="Kelola seluruh project." />
      <Card title="Status">
        <Scaffold items={["Filter","Detail"]} />
      </Card>
    </div>
  );
}
