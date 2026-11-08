import { describe, expect, it } from "vitest";
import { MVP_PRODUCT_TYPES, isMvpProductType } from "@/shared/types";
import { mockTemplates } from "@/shared/lib/mock-data";

describe("MVP product scope", () => {
  it("allows only LAND in the current MVP", () => {
    expect(MVP_PRODUCT_TYPES).toEqual(["LAND"]);
    expect(isMvpProductType("LAND")).toBe(true);
    expect(isMvpProductType("WEB")).toBe(false);
    expect(isMvpProductType("COMM")).toBe(false);
  });

  it("keeps the mock catalog aligned to the eight LAND templates", () => {
    expect(mockTemplates).toHaveLength(8);
    expect(mockTemplates.every((template) => template.productType === "LAND")).toBe(true);
  });
});
