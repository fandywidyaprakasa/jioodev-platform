import { describe, expect, it } from "vitest";
import {
  PREVIEW_IFRAME_SANDBOX,
  shouldSandboxPreviewIframe,
} from "@/lib/iframe-sandbox";
import {
  PREVIEW_CSP,
  PREVIEW_HEADER_SOURCES,
  previewHeaderRules,
} from "@/lib/preview-headers.mjs";

describe("iframe sandbox policy", () => {
  it("sandbox excludes top-navigation and popups escapes", () => {
    expect(PREVIEW_IFRAME_SANDBOX).not.toContain("allow-top-navigation");
    expect(PREVIEW_IFRAME_SANDBOX).not.toContain("allow-popups");
    expect(PREVIEW_IFRAME_SANDBOX).not.toContain("allow-same-origin");
  });

  it("allows scripts and forms so previews stay interactive", () => {
    expect(PREVIEW_IFRAME_SANDBOX).toContain("allow-scripts");
    expect(PREVIEW_IFRAME_SANDBOX).toContain("allow-forms");
  });
});

describe("shouldSandboxPreviewIframe", () => {
  it("matches same-origin preview routes", () => {
    expect(shouldSandboxPreviewIframe("/preview/token-1")).toBe(true);
    expect(shouldSandboxPreviewIframe("/preview/token-1?page=2")).toBe(true);
    expect(shouldSandboxPreviewIframe("/template-preview/WEB-01/desktop")).toBe(true);
    expect(shouldSandboxPreviewIframe("/composition-preview/comp-1")).toBe(true);
    expect(shouldSandboxPreviewIframe("/variant-preview/S-HERO/hero-x")).toBe(true);
  });

  it("does not match editor or published site routes", () => {
    expect(shouldSandboxPreviewIframe("/app/workspace/abc")).toBe(false);
    expect(shouldSandboxPreviewIframe("/p/slug")).toBe(false);
    expect(shouldSandboxPreviewIframe("https://custom.domain.example/")).toBe(
      false,
    );
    expect(shouldSandboxPreviewIframe("/previewx/other")).toBe(false);
  });
});

describe("preview route CSP headers", () => {
  it("applies enforced CSP to all preview routes", () => {
    const rules = previewHeaderRules();
    for (const source of PREVIEW_HEADER_SOURCES) {
      const rule = rules.find((item) => item.source === source);
      expect(rule, source).toBeTruthy();
      const csp = rule?.headers.find(
        (header) => header.key === "Content-Security-Policy",
      );
      expect(csp?.value, source).toBe(PREVIEW_CSP);
      const xfo = rule?.headers.find(
        (header) => header.key === "X-Frame-Options",
      );
      expect(xfo?.value, source).toBe("SAMEORIGIN");
    }
  });

  it("CSP blocks top-navigation escape vectors", () => {
    expect(PREVIEW_CSP).toContain("form-action 'self'");
    expect(PREVIEW_CSP).toContain("base-uri 'self'");
    expect(PREVIEW_CSP).toContain("frame-ancestors 'self'");
    expect(PREVIEW_CSP).toContain("object-src 'none'");
  });

  it("CSP still permits Next hydration inline scripts", () => {
    expect(PREVIEW_CSP).toContain("'unsafe-inline'");
    expect(PREVIEW_CSP).toContain("'unsafe-eval'");
  });
});
