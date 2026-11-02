import { PageHeader, Card, Scaffold } from "@/shared/ui/page";

export default function Page() {
  return (
    <div>
      <PageHeader eyebrow="Admin" title="Konten" description="Kelola template/section/copy." />
      <Card title="Status">
        <Scaffold items={["Template","Section","Copy"]} />
      </Card>
    </div>
  );
}
