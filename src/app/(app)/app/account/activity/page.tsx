import { redirect } from "next/navigation";
import { listActivity } from "@/shared/lib/account-server";
import { currentUser } from "@/shared/lib/server-auth";
import { dateTimeID } from "@/shared/lib/format";
import { Card, Empty, PageHeader } from "@/shared/ui";

export const dynamic = "force-dynamic";

export default async function ActivityPage() {
  const user = await currentUser();
  if (!user || user.role === "guest") redirect("/login?next=/app/account/activity");
  const activity = await listActivity(user.id).catch(() => []);

  return (
    <div>
      <PageHeader
        title="Aktivitas"
        description="Riwayat aksi pada akun dan project."
      />
      <Card title="Timeline">
        {activity.length ? (
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
        ) : (
          <Empty title="Belum ada aktivitas" description="Aktivitas akan tercatat otomatis." />
        )}
      </Card>
    </div>
  );
}
