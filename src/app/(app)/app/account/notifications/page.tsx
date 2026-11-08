import { redirect } from "next/navigation";
import { NotificationList } from "@/modules/account/client";
import { listNotifications } from "@/modules/account";
import { currentUser } from "@/modules/auth";
import { PageHeader } from "@/shared/ui";

export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const user = await currentUser();
  if (!user || user.role === "guest") redirect("/login?next=/app/account/notifications");
  const notifications = await listNotifications(user.id).catch(() => []);

  return (
    <div>
      <PageHeader
        title="Notifikasi"
        description="Event terbaru terkait project dan pembayaran."
      />
      <NotificationList notifications={notifications} />
    </div>
  );
}
