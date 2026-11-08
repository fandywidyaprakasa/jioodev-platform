import type { Project } from "@/shared/types";

export interface ProjectGroup {
  label: string;
  projects: Project[];
}

export function groupProjects(projects: Project[]): ProjectGroup[] {
  const groups = new Map<string, Project[]>();
  for (const project of projects) {
    const label = project.clientLabel.trim() || "Tanpa label";
    groups.set(label, [...(groups.get(label) ?? []), project]);
  }
  return [...groups.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([label, items]) => ({ label, projects: items }));
}
