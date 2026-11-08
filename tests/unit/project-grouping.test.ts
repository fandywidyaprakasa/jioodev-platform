import { describe, expect, it } from "vitest";
import { groupProjects } from "@/modules/projects";
import type { Project } from "@/shared/types";

function project(id: string, clientLabel: string): Project {
  return {
    id,
    clientLabel,
    productType: "LAND",
    status: "DRAFT",
    createdAt: "2026-11-04T00:00:00.000Z",
    updatedAt: "2026-11-04T00:00:00.000Z",
  };
}

describe("project grouping", () => {
  it("groups projects by client label", () => {
    const groups = groupProjects([
      project("p1", "Kopi Pagi"),
      project("p2", "Batik Lestari"),
      project("p3", "Kopi Pagi"),
    ]);

    expect(groups).toHaveLength(2);
    expect(groups.find((group) => group.label === "Kopi Pagi")?.projects).toHaveLength(2);
    expect(groups.find((group) => group.label === "Batik Lestari")?.projects).toHaveLength(1);
  });

  it("falls back to a stable label for empty client labels", () => {
    const groups = groupProjects([project("p1", "   ")]);
    expect(groups[0].label).toBe("Tanpa label");
  });
});
