import { afterEach, describe, expect, it } from "vitest";
import {
  buildPublicPath,
  injectSeo,
  publicBaseUrl,
  slugify,
} from "@/shared/lib/published-server";

describe("published page helpers", () => {
  afterEach(() => {
    delete process.env.PUBLIC_PAGE_BASE_URL;
    delete process.env.NEXTAUTH_URL;
  });

  it("slugifies business names", () => {
    expect(slugify("Kopi Pagi Hari!")).toBe("kopi-pagi-hari");
    expect(slugify("  Café  Ångström  ")).toBe("cafe-angstrom");
    expect(slugify("")).toBe("halaman");
    expect(slugify("---")).toBe("halaman");
    expect(slugify("a".repeat(80)).length).toBeLessThanOrEqual(48);
  });

  it("builds public paths", () => {
    expect(buildPublicPath("kopi-pagi")).toBe("/p/kopi-pagi");
  });

  it("uses configured public base url", () => {
    process.env.PUBLIC_PAGE_BASE_URL = "https://pages.jioo.site/";
    expect(publicBaseUrl()).toBe("https://pages.jioo.site");
    process.env.PUBLIC_PAGE_BASE_URL = "";
    process.env.NEXTAUTH_URL = "https://app.jioo.site";
    expect(publicBaseUrl()).toBe("https://app.jioo.site");
    expect(publicBaseUrl("https://example.com")).toBe("https://app.jioo.site");
  });

  it("injects SEO tags before head close", () => {
    const html = injectSeo("<html><head><title>X</title></head><body></body></html>", {
      url: "https://app.jioo.site/p/kopi",
      title: "Kopi & Co",
      description: "Halaman <kopi>",
      noindex: false,
    });
    expect(html).toContain('<link rel="canonical" href="https://app.jioo.site/p/kopi">');
    expect(html).toContain('<meta name="robots" content="index,follow">');
    expect(html).toContain("Kopi &amp; Co");
    expect(html).toContain("Halaman &lt;kopi&gt;");
    expect(html.indexOf("canonical")).toBeLessThan(html.indexOf("</head>"));
  });

  it("marks noindex pages", () => {
    const html = injectSeo("<html><head></head><body></body></html>", {
      url: "https://app.jioo.site/p/x",
      title: "X",
      noindex: true,
    });
    expect(html).toContain("noindex,nofollow");
  });
});
