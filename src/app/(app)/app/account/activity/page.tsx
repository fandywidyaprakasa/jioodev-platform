import { api } from "@/shared/lib/api";
import { dateTimeID } from "@/shared/lib/format";
import { Card, PageHeader } from "@/shared/ui";

export default async function ActivityPage() {
  const activity = await api.account.activity();

  return (
    <div>
      <PageHeader
        eyebrow="Akun"
        title="Aktivitas"
        description="Riwayat aksi pada akun dan project."
      />
      <Card title="Timeline">
        <ol className="relative space-y-4 border-l border-line pl-4">
          {activity.map((item) => (
            <li key={item.id}>
              <p className="text-sm text-ink">
                <span className="font-medium">{item.actor}</span> {item.action}
              </p>
              <p className="text-xs text-muted">{dateTimeID(item.createdAt)}</p>
            </li>
          ))}
        </ol>
      </Card>
    </div>
  );
}
