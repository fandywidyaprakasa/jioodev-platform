import { PageHeader, Card, Scaffold } from "@/shared/ui/page";

export default function Page() {
  return (
    <div>
      <PageHeader eyebrow="Admin" title="Pembayaran" description="Konfirmasi pembayaran." />
      <Card title="Status">
        <Scaffold items={["Pending","Konfirmasi","Refund"]} />
      </Card>
    </div>
  );
}
