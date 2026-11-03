import { ProjectList } from "@/modules/projects/components/project-list";
import { listProjects } from "@/shared/lib/projects-server";
import { PageHeader } from "@/shared/ui";

export const dynamic = "force-dynamic";

export default async function AdminProjectsPage() {
  const projects = await listProjects("", true).catch(() => []);

  return (
    <div>
      <PageHeader
        title="Semua Project"
        description="Kelola seluruh project lintas user."
      />
      <ProjectList
        projects={projects}
        basePath="/admin/projects"
        showCreate={false}
      />
    </div>
  );
}
