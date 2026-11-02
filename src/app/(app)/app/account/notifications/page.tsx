import { NotificationList } from "@/modules/account/components/notification-list";
import { api } from "@/shared/lib/api";
import { PageHeader } from "@/shared/ui";

export default async function NotificationsPage() {
  const notifications = await api.account.notifications();

  return (
    <div>
      <PageHeader
        eyebrow="Akun"
        title="Notifikasi"
        description="Event terbaru terkait project dan pembayaran."
      />
      <NotificationList notifications={notifications} />
    </div>
  );
}
