import Link from "next/link";
import { api } from "@/shared/lib/api";
import { dateID } from "@/shared/lib/format";
import { Card, PageHeader, Progress, Stat, StatusBadge } from "@/shared/ui";

export default async function DashboardPage() {
  const [projects, subscription, notifications] = await Promise.all([
    api.projects.list(),
    api.account.subscription(),
    api.account.notifications(),
  ]);

  const activeProjects = projects.filter((project) =>
    ["INTAKE", "COMPREHENDED", "PREVIEWS", "PICKED", "PAID", "DEPLOYED", "ACTIVE"].includes(
      project.status,
    ),
  );
  const unread = notifications.filter((item) => !item.read);
  const pending = projects.filter((project) => project.status === "PREVIEWS");

  return (
    <div>
      <PageHeader
        eyebrow="Workspace"
        title="Dashboard"
        description="Ringkasan project, kuota, dan aktivitas terbaru."
        actions={
          <Link
            href="/app/projects/new"
            className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-strong"
          >
            Buat Project
          </Link>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Project aktif" value={activeProjects.length} hint={`${projects.length} total`} />
        <Stat
          label="Kuota deploy"
          value={`${subscription.quotaUsed}/${subscription.quotaTotal}`}
          hint={subscription.plan}
        />
        <Stat label="Preview menunggu" value={pending.length} hint="Pilih varian" />
        <Stat label="Notifikasi" value={unread.length} hint="Belum dibaca" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Card title="Project terbaru" description="Lanjutkan alur yang sedang berjalan.">
          <ul className="divide-y divide-line">
            {projects.slice(0, 4).map((project) => (
              <li key={project.id} className="flex flex-wrap items-center gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/app/projects/${project.id}`}
                    className="font-medium text-ink hover:text-accent"
                  >
                    {project.clientLabel}
                  </Link>
                  <p className="text-xs text-muted">
                    {project.productType} · diperbarui {dateID(project.updatedAt)}
                  </p>
                </div>
                <StatusBadge status={project.status} />
                <Link
                  href={`/app/projects/${project.id}`}
                  className="text-sm font-medium text-accent hover:underline"
                >
                  Buka
                </Link>
              </li>
            ))}
          </ul>
        </Card>

        <div className="space-y-4">
          <Card title="Kuota & paket">
            <Progress
              value={subscription.quotaUsed}
              max={subscription.quotaTotal}
              label={`${subscription.plan} · ${subscription.quotaUsed}/${subscription.quotaTotal}`}
            />
            <p className="mt-3 text-sm text-muted">Perpanjangan berikutnya: {dateID(subscription.renewAt)}.</p>
          </Card>
          <Card title="Aktivitas terbaru">
            <ul className="space-y-3 text-sm">
              {notifications.slice(0, 3).map((item) => (
                <li key={item.id}>
                  <p className="font-medium text-ink">{item.title}</p>
                  <p className="text-xs text-muted">{item.body}</p>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}
