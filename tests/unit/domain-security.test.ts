import { beforeEach, describe, expect, it } from "vitest";
import {
  domainCnameTarget,
  domainVerificationHost,
  domainVerificationToken,
  normalizeDomain,
} from "@/modules/publishing/application/deploy";

describe("domain security", () => {
  beforeEach(() => {
    process.env.PLATFORM_DOMAIN = "jioo.site";
    process.env.DOMAIN_CNAME_TARGET = "cname.jioo.site";
    delete process.env.RESERVED_DOMAINS;
  });

  it("normalizes valid domains", () => {
    expect(normalizeDomain(" Contoh.COM. ")).toBe("contoh.com");
    expect(normalizeDomain("sub.contoh.co.id")).toBe("sub.contoh.co.id");
  });

  it("rejects invalid and unsafe domain input", () => {
    for (const value of [
      "https://contoh.com",
      "contoh.com/path",
      "contoh.com:443",
      "user@contoh.com",
      "localhost",
      "1.2.3.4",
      "-contoh.com",
      "contoh..com",
      "contoh",
      "",
    ]) {
      expect(normalizeDomain(value), value).toBeNull();
    }
  });

  it("protects platform domains and subdomains", () => {
    expect(normalizeDomain("jioo.site")).toBeNull();
    expect(normalizeDomain("app.jioo.site")).toBeNull();
    expect(normalizeDomain("evil.jioo.site")).toBeNull();
  });

  it("honours additional reserved domains", () => {
    process.env.RESERVED_DOMAINS = "example.internal,partner.test";
    expect(normalizeDomain("x.partner.test")).toBeNull();
    expect(normalizeDomain("contoh.com")).toBe("contoh.com");
  });

  it("exposes deterministic verification token and host", () => {
    expect(domainVerificationToken("dom_1")).toBe("jioo-verify=dom_1");
    expect(domainVerificationHost("contoh.com")).toBe("_jioo.contoh.com");
    expect(domainCnameTarget()).toBe("cname.jioo.site");
  });
});
