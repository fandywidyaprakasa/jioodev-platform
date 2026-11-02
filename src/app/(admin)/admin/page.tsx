import { PageHeader, Card, Scaffold } from "@/shared/ui/page";

export default function Page() {
  return (
    <div>
      <PageHeader eyebrow="Admin" title="Dashboard Admin" description="Ringkasan operasional." />
      <Card title="Status">
        <Scaffold items={["Project","Pembayaran","Deploy"]} />
      </Card>
    </div>
  );
}
