import { describe, expect, it } from "vitest";
import { canAccess } from "@/shared/lib/projects-server";
import type { PbProject } from "@/shared/lib/projects-server";
import { isSessionExpired, sessionMaxAgeMs } from "@/shared/lib/session-policy";

const base = {
  id: "p1",
  created: "",
  updated: "",
} as PbProject;

describe("project access control", () => {
  it("allows the owner and admins", () => {
    expect(canAccess({ ...base, user_id: "u1" }, "u1", false)).toBe(true);
    expect(canAccess({ ...base, user_id: "u2" }, "u1", true)).toBe(true);
  });

  it("allows the matching guest session", () => {
    expect(
      canAccess({ ...base, guest_session_id: "g1" }, undefined, false, "g1"),
    ).toBe(true);
    expect(
      canAccess({ ...base, guest_session_id: "g1" }, undefined, false, "g2"),
    ).toBe(false);
  });

  it("rejects unrelated users and guests", () => {
    expect(canAccess({ ...base, user_id: "u1" }, "u2", false)).toBe(false);
    expect(canAccess(base, undefined, false, "g1")).toBe(false);
  });
});

describe("session policy", () => {
  it("uses admin, remember, and default windows", () => {
    expect(sessionMaxAgeMs("admin", true)).toBe(8 * 3600 * 1000);
    expect(sessionMaxAgeMs("user", true)).toBe(30 * 24 * 3600 * 1000);
    expect(sessionMaxAgeMs("user", false)).toBe(12 * 3600 * 1000);
  });

  it("expires after the window", () => {
    const now = 1_000_000_000_000;
    expect(
      isSessionExpired({ lastActive: now - 11 * 3600 * 1000, remember: false, now }),
    ).toBe(false);
    expect(
      isSessionExpired({ lastActive: now - 13 * 3600 * 1000, remember: false, now }),
    ).toBe(true);
    expect(
      isSessionExpired({
        lastActive: now - 9 * 3600 * 1000,
        role: "admin",
        remember: true,
        now,
      }),
    ).toBe(true);
  });
});
