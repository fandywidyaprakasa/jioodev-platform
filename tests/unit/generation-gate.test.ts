import { beforeEach, describe, expect, it, vi } from "vitest";

const { findProject, listRecords } = vi.hoisted(() => ({
  findProject: vi.fn(),
  listRecords: vi.fn(),
}));

vi.mock("@/modules/projects", () => ({
  canTransition: vi.fn(() => true),
  findProject,
  getBusinessProfile: vi.fn(),
  getProjectSections: vi.fn(),
  setProjectStatus: vi.fn(),
  getProjectCopy: vi.fn(),
}));

vi.mock("@/modules/account", () => ({
  createNotification: vi.fn(),
}));

vi.mock("@/shared/infrastructure/pocketbase/pb-platform", () => ({
  createRecord: vi.fn(),
  escapeFilter: (value: string) => value,
  getRecord: vi.fn(),
  listRecords,
  updateRecord: vi.fn(),
}));

import { createOrGetJob } from "@/modules/generation";

describe("generation readiness gate", () => {
  beforeEach(() => {
    findProject.mockReset();
    listRecords.mockReset();
  });

  it("does not create a job before the template is chosen", async () => {
    findProject.mockResolvedValue({
      id: "proj_gate",
      status: "COMPREHENDED",
      template_id: "LAND-LMENU-EDT-003",
    });

    await expect(createOrGetJob("proj_gate")).resolves.toBeNull();
    expect(listRecords).not.toHaveBeenCalled();
  });

  it("does not create a job without a template", async () => {
    findProject.mockResolvedValue({
      id: "proj_gate",
      status: "TEMPLATE_CHOSEN",
      template_id: null,
    });

    await expect(createOrGetJob("proj_gate")).resolves.toBeNull();
    expect(listRecords).not.toHaveBeenCalled();
  });
});
