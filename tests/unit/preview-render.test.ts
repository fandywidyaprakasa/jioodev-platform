import { describe, expect, it } from "vitest";
import { renderTemplateByCode } from "@/shared/lib/preview-render";

describe("template preview security", () => {
  it("rejects templates that are not READY", async () => {
    await expect(renderTemplateByCode("WEB-LMENU-EDT-009")).rejects.toThrow(
      "Template belum READY",
    );
  });

  it("rejects path traversal in template code", async () => {
    await expect(renderTemplateByCode("../package")).rejects.toThrow(
      "Kode template tidak valid",
    );
    await expect(renderTemplateByCode("LAND-LMENU-EDT-003/../../secret")).rejects.toThrow(
      "Kode template tidak valid",
    );
  });
});
