import { PageHeader, Card, Scaffold } from "@/shared/ui/page";

export default function Page() {
  return (
    <div>
      <PageHeader eyebrow="Akun" title="Tagihan" description="Daftar invoice." />
      <Card title="Status">
        <Scaffold items={["Status","Unduh"]} />
      </Card>
    </div>
  );
}
