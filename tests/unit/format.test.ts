import { describe, expect, it } from "vitest";
import { rupiah, statusLabel } from "@/shared/lib/format";

describe("format helpers", () => {
  it("formats IDR without decimals", () => {
    expect(rupiah(349000)).toContain("349.000");
    expect(rupiah(349000)).toContain("Rp");
  });

  it("labels known statuses and falls back", () => {
    expect(statusLabel("PAID")).toBe("Dibayar");
    expect(statusLabel("CUSTOM")).toBe("CUSTOM");
  });
});
