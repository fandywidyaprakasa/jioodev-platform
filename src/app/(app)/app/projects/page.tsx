import Link from "next/link";
import { ProjectList } from "@/modules/projects/client";
import { currentUser } from "@/modules/auth";
import { listProjects } from "@/modules/projects";
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
        description="Semua project klien, dikelompokkan berdasarkan label klien."
        actions={
          <Link
            href="/app/projects/new"
            className="inline-flex items-center rounded-full bg-accent px-4 py-2 text-sm font-medium text-on-accent transition-[background-color,border-color,color,transform] duration-150 active:scale-[0.96] hover:bg-accent-strong"
          >
            Buat Project
          </Link>
        }
      />
      <ProjectList projects={projects} />
    </div>
  );
}
