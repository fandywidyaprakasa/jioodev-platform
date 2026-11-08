import { describe, expect, it } from "vitest";
import { isNavItemActive, type NavItem } from "@/shared/lib/nav";

const dashboard: NavItem = { href: "/app", label: "Dashboard", exact: true };
const projects: NavItem = { href: "/app/projects", label: "Projects" };
const account: NavItem = { href: "/app/account", label: "Akun", exact: true };
const notifications: NavItem = {
  href: "/app/account/notifications",
  label: "Notifikasi",
  exact: true,
};

describe("sidebar active state", () => {
  it("keeps Dashboard exact", () => {
    expect(isNavItemActive("/app", dashboard)).toBe(true);
    expect(isNavItemActive("/app/projects", dashboard)).toBe(false);
    expect(isNavItemActive("/app/account", dashboard)).toBe(false);
  });

  it("activates Projects for project detail routes", () => {
    expect(isNavItemActive("/app/projects", projects)).toBe(true);
    expect(isNavItemActive("/app/projects/123/workspace", projects)).toBe(true);
  });

  it("does not double-activate Account on child routes", () => {
    expect(isNavItemActive("/app/account", account)).toBe(true);
    expect(isNavItemActive("/app/account/notifications", account)).toBe(false);
    expect(
      isNavItemActive("/app/account/notifications", notifications),
    ).toBe(true);
  });
});
