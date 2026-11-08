import Link from "next/link";
import { dateID } from "@/shared/lib/format";
import { getSubscription, listNotifications } from "@/modules/account";
import { listProjects } from "@/modules/projects";
import { productLabel } from "@/shared/lib/taxonomy";
import { currentUser } from "@/modules/auth";
import { Card, PageHeader, Progress, Stat, StatusBadge } from "@/shared/ui";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await currentUser();
  const realUser = user && user.role !== "guest" ? user : null;
  const [projects, subscription, notifications] = await Promise.all([
    user
      ? listProjects(
          user.role === "guest" ? undefined : user.id,
          user.role === "admin",
          user.guestId,
        ).catch(() => [])
      : [],
    realUser ? getSubscription(realUser.id).catch(() => null) : Promise.resolve(null),
    realUser ? listNotifications(realUser.id).catch(() => []) : Promise.resolve([]),
  ]);
  const sub = subscription ?? {
    plan: "Belum berlangganan",
    status: "EXPIRED" as const,
    quotaUsed: 0,
    quotaTotal: 0,
    renewAt: new Date().toISOString(),
  };

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
        title="Dashboard"
        description="Ringkasan project klien, kuota, dan aktivitas terbaru."
        actions={
          <Link
            href="/app/projects/new"
            className="inline-flex items-center rounded-full bg-accent px-4 py-2 text-sm font-medium text-on-accent transition-[background-color,border-color,color,transform] duration-150 active:scale-[0.96] hover:bg-accent-strong"
          >
            Buat Project
          </Link>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Project aktif" value={activeProjects.length} hint={`${projects.length} total`} />
        <Stat
          label="Kuota deploy"
          value={`${sub.quotaUsed}/${sub.quotaTotal}`}
          hint={sub.plan}
        />
        <Stat label="Preview menunggu" value={pending.length} hint="Pilih varian" />
        <Stat label="Notifikasi" value={unread.length} hint="Belum dibaca" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Card
          title="Project terbaru"
          description="Lanjutkan alur yang sedang berjalan."
          actions={
            projects.length ? (
              <Link href="/app/projects" className="text-sm font-medium text-accent hover:underline">
                Lihat semua
              </Link>
            ) : null
          }
        >
          {!projects.length ? (
            <div className="py-6">
              <p className="text-[15px] font-medium text-ink">Belum ada project.</p>
              <p className="mt-1 max-w-sm text-sm leading-relaxed text-muted">
                Mulai dari satu project Landing, lalu isi konteks bisnis klien. Varian
                pertama biasanya siap dalam beberapa menit.
              </p>
              <Link
                href="/app/projects/new"
                className="mt-4 inline-flex min-h-11 items-center rounded-full bg-accent px-4 text-sm font-medium text-on-accent transition-[background-color,border-color,color,transform] duration-150 active:scale-[0.96] hover:bg-accent-strong"
              >
                Buat project pertama
              </Link>
            </div>
          ) : (
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
                    {productLabel(project.productType)} · diperbarui {dateID(project.updatedAt)}
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
          )}
        </Card>

        <div className="space-y-4">
          <Card
            title="Template Library"
            description="Mulai dari fondasi desain yang sudah siap."
          >
            <p className="text-sm leading-relaxed text-muted">
              Pilih theme dan varian, lalu buat project dengan template tersebut
              sudah terpasang.
            </p>
            <Link
              href="/app/templates"
              className="mt-4 inline-flex min-h-11 items-center rounded-full border border-line px-4 text-sm font-medium text-ink transition-[background-color,border-color,color,transform] duration-150 active:scale-[0.96] hover:border-ink/40"
            >
              Jelajahi template
            </Link>
          </Card>
          <Card title="Kuota & paket">
            <Progress
              value={sub.quotaUsed}
              max={sub.quotaTotal}
              label={`${sub.plan} · ${sub.quotaUsed}/${sub.quotaTotal}`}
            />
            <p className="mt-3 text-sm text-muted">Perpanjangan berikutnya: {dateID(sub.renewAt)}.</p>
          </Card>
          <Card title="Aktivitas terbaru">
            {notifications.length ? (
              <ul className="space-y-3 text-sm">
                {notifications.slice(0, 3).map((item) => (
                  <li key={item.id}>
                    <p className="font-medium text-ink">{item.title}</p>
                    <p className="mt-0.5 text-xs leading-relaxed text-muted">{item.body}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="py-2 text-sm leading-relaxed text-muted">
                Belum ada aktivitas. Notifikasi pembayaran dan preview akan muncul di sini.
              </p>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
