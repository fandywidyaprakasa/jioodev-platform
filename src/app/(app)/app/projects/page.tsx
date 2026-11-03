import Link from "next/link";
import { ProjectList } from "@/modules/projects/components/project-list";
import { currentUser } from "@/shared/lib/server-auth";
import { listProjects } from "@/shared/lib/projects-server";
import { PageHeader } from "@/shared/ui";

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const user = await currentUser();
  const projects = user
    ? await listProjects(
        user.role === "guest" ? undefined : user.id,
        user.role === "admin",
        user.guestId,
      ).catch(() => [])
    : [];

  return (
    <div>
      <PageHeader
        title="Daftar Project"
        description="Semua project Anda, lengkap dengan status alur."
        actions={
          <Link
            href="/app/projects/new"
            className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-on-accent hover:bg-accent-strong"
          >
            Buat Project
          </Link>
        }
      />
      <ProjectList projects={projects} />
    </div>
  );
}
