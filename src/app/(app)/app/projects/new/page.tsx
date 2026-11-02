import { NewProjectForm } from "@/modules/projects/components/new-project-form";
import { PageHeader } from "@/shared/ui";

export default function NewProjectPage() {
  return (
    <div>
      <PageHeader
        eyebrow="Project"
        title="Buat Project"
        description="Pilih tipe produk untuk memulai alur."
      />
      <NewProjectForm />
    </div>
  );
}
