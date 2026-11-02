import { PageHeader, Card, Scaffold } from "@/shared/ui/page";

export default function Page() {
  return (
    <div>
      <PageHeader eyebrow="Kontak" title="Hubungi Kami" description="Kami siap membantu." />
      <Card title="Status">
        <Scaffold items={["WhatsApp","Email"]} />
      </Card>
    </div>
  );
}
