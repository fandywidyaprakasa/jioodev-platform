import { PageHeader, Card, Scaffold } from "@/shared/ui/page";

export default function Page() {
  return (
    <div>
      <PageHeader eyebrow="Harga" title="Harga & Paket" description="Paket pay-per-deploy dan subscription." />
      <Card title="Status">
        <Scaffold items={["Landing","Website","Commerce Lite"]} />
      </Card>
    </div>
  );
}
