import { PageHeader, Card, Scaffold } from "@/shared/ui/page";

export default function Page() {
  return (
    <div>
      <PageHeader eyebrow="Fitur" title="Fitur JSDEV" description="Ringkasan kapabilitas platform." />
      <Card title="Status">
        <Scaffold items={["Design foundation","AI transformation","Preview two-axis"]} />
      </Card>
    </div>
  );
}
