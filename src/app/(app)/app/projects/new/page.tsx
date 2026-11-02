import { PageHeader, Card, Scaffold } from "@/shared/ui/page";

export default function Page() {
  return (
    <div>
      <PageHeader eyebrow="Project" title="Buat Project" description="Pilih tipe produk." />
      <Card title="Status">
        <Scaffold items={["Landing","Website","Commerce"]} />
      </Card>
    </div>
  );
}
