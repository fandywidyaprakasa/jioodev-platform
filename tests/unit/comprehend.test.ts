import { describe, expect, it } from "vitest";
import { summarizeBusiness } from "@/shared/lib/projects-server";

describe("comprehend fallback", () => {
  it("returns the safe fallback when context is missing", () => {
    const result = summarizeBusiness(null);
    expect(result.summary.length).toBeGreaterThan(20);
    expect(result.confidence).toBeGreaterThanOrEqual(0);
    expect(result.confidence).toBeLessThanOrEqual(1);
  });

  it("summarizes business, audience, purpose, and channels", () => {
    const result = summarizeBusiness({
      id: "bp_1",
      project_id: "proj_1",
      business_name: "Kopi Pagi",
      industry: "FNB",
      business_purpose: ["SAL", "VIS"],
      target_audience: "Pekerja kantor",
      channels: ["WhatsApp", "Instagram"],
      design_pref: "Hangat",
      business_goals: "Meningkatkan order",
    });
    expect(result.summary).toContain("Kopi Pagi");
    expect(result.summary).toContain("Pekerja kantor");
    expect(result.summary).toContain("SAL");
    expect(result.summary).toContain("WhatsApp");
    expect(result.confidence).toBeGreaterThan(0.5);
  });
});
