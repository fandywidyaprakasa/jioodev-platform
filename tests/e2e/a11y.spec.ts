import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const PAGES = [
  "/",
  "/features",
  "/pricing",
  "/templates",
  "/templates/LAND-LMENU-EDT-003",
  "/templates/theme/editorial-warm",
  "/contact",
  "/login",
  "/register",
  "/forgot-password",
  "/app",
  "/app/projects/new",
  "/admin",
  "/admin/projects",
  "/admin/payments",
  "/admin/packages",
  "/admin/deploy",
  "/admin/content",
  "/admin/settings",
  "/admin/audit",
];

for (const path of PAGES) {
  test(`a11y ${path}`, async ({ page }) => {
    await page.goto(path);
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa"])
      .analyze();
    const summary = results.violations
      .map(
        (violation) =>
          `${violation.id}: ${violation.help} (${violation.nodes.length} node)`,
      )
      .join("\n");
    expect(results.violations, summary).toEqual([]);
  });
}
