import { describe, expect, it } from "vitest";
import {
  buildImageUrl,
  getImageSizes,
  getImageSrcSet,
  isOptimizableImageSrc,
  isWidthInRange,
  parseImageParams,
  resolveLibraryPath,
} from "@/lib/image-loader";

describe("image-loader helpers", () => {
  describe("isOptimizableImageSrc", () => {
    it("accepts same-origin raster paths", () => {
      expect(isOptimizableImageSrc("/themes/theme-a/assets/hero.png")).toBe(true);
      expect(isOptimizableImageSrc("/templates/WEB-01/assets/photo.jpg")).toBe(true);
      expect(isOptimizableImageSrc("/x.webp")).toBe(true);
    });

    it("rejects external, protocol-relative, svg, and odd inputs", () => {
      expect(isOptimizableImageSrc("https://cdn.example.com/a.png")).toBe(false);
      expect(isOptimizableImageSrc("//evil.example/a.png")).toBe(false);
      expect(isOptimizableImageSrc("/themes/a/logo.svg")).toBe(false);
      expect(isOptimizableImageSrc("/themes/a/doc.pdf")).toBe(false);
      expect(isOptimizableImageSrc(123)).toBe(false);
      expect(isOptimizableImageSrc(null)).toBe(false);
    });
  });

  describe("isWidthInRange", () => {
    it("allows integers within 8..3000", () => {
      expect(isWidthInRange(8)).toBe(true);
      expect(isWidthInRange(3000)).toBe(true);
    });
    it("rejects out-of-range, non-integer values", () => {
      expect(isWidthInRange(7)).toBe(false);
      expect(isWidthInRange(3001)).toBe(false);
      expect(isWidthInRange(640.5)).toBe(false);
      expect(isWidthInRange(NaN)).toBe(false);
    });
  });

  describe("buildImageUrl", () => {
    it("builds /api/image url for optimizable src", () => {
      const url = buildImageUrl("/themes/a/assets/hero.png", { width: 1024 });
      expect(url).toContain("/api/image?");
      expect(url).toContain("v=%2Fthemes%2Fa%2Fassets%2Fhero.png");
      expect(url).toContain("w=1024");
      expect(url).toContain("q=82");
      expect(url).toContain("f=webp");
    });

    it("passes through non-optimizable src untouched", () => {
      const url = buildImageUrl("https://cdn.example.com/a.png", { width: 640 });
      expect(url).toBe("https://cdn.example.com/a.png");
      expect(buildImageUrl("/themes/a/logo.svg", { width: 640 })).toBe(
        "/themes/a/logo.svg",
      );
    });

    it("passes through when width/quality invalid", () => {
      expect(buildImageUrl("/a.png", { width: 4 })).toBe("/a.png");
      expect(buildImageUrl("/a.png", { width: 640, quality: 10 })).toBe("/a.png");
      expect(
        buildImageUrl("/a.png", { width: 640, format: "svg" as never }),
      ).toBe("/a.png");
    });
  });

  describe("getImageSrcSet", () => {
    it("builds comma separated srcset with width descriptors", () => {
      const srcset = getImageSrcSet("/themes/a/assets/x.png", [640, 1024]);
      expect(srcset).toBe(
        [
          "/api/image?v=%2Fthemes%2Fa%2Fassets%2Fx.png&w=640&q=82&f=webp 640w",
          "/api/image?v=%2Fthemes%2Fa%2Fassets%2Fx.png&w=1024&q=82&f=webp 1024w",
        ].join(", "),
      );
    });
    it("drops invalid widths", () => {
      const srcset = getImageSrcSet("/a.png", [0, 640, 9999]);
      expect(srcset.split(", ").map((part) => part.split(" ").pop())).toEqual([
        "640w",
      ]);
    });
  });

  describe("getImageSizes", () => {
    it("returns default sizes when none given", () => {
      expect(getImageSizes()).toBe(
        "(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw",
      );
    });
    it("returns provided sizes", () => {
      expect(getImageSizes("50vw")).toBe("50vw");
    });
  });

  describe("resolveLibraryPath", () => {
    it("resolves theme and template paths", () => {
      expect(resolveLibraryPath("/themes/theme-x/assets/bg.png")).toEqual({
        kind: "themes",
        id: "theme-x",
        parts: ["assets", "bg.png"],
      });
      expect(resolveLibraryPath("/templates/WEB-01/previews/web.webp")).toEqual({
        kind: "templates",
        id: "WEB-01",
        parts: ["previews", "web.webp"],
      });
    });

    it("rejects traversal, unsafe parts, and unknown roots", () => {
      expect(resolveLibraryPath("/themes/../library/x.png")).toBeNull();
      expect(resolveLibraryPath("/themes/a/../../etc/passwd.png")).toBeNull();
      expect(resolveLibraryPath("/private/a/x.png")).toBeNull();
      expect(resolveLibraryPath("/themes/a/x.png")).not.toBeNull();
      expect(resolveLibraryPath("/themes/a/./x.png")).toBeNull();
      expect(resolveLibraryPath("/themes/<script>/x.png")).toBeNull();
      expect(resolveLibraryPath("/themes/_base/x.png")).toBeNull();
      expect(resolveLibraryPath("/runtime/a/x.png")).toBeNull();
      expect(resolveLibraryPath("/themes/a")).toBeNull();
    });

    it("rejects svg despite src validation existence", () => {
      expect(resolveLibraryPath("/themes/a/logo.svg")).toBeNull();
    });
  });

  describe("parseImageParams", () => {
    function params(v: string, w: string, q?: string, f?: string): URLSearchParams {
      const sp = new URLSearchParams({ v, w });
      if (q !== undefined) sp.set("q", q);
      if (f !== undefined) sp.set("f", f);
      return sp;
    }

    it("parses valid params", () => {
      const parsed = parseImageParams(
        params("/themes/a/x.png", "1024", "80", "avif"),
      );
      expect(parsed).toEqual({
        src: "/themes/a/x.png",
        width: 1024,
        quality: 80,
        format: "avif",
      });
    });

    it("applies defaults q=82 f=webp", () => {
      const parsed = parseImageParams(params("/a.png", "640"));
      expect(parsed?.quality).toBe(82);
      expect(parsed?.format).toBe("webp");
    });

    it("rejects invalid src, width, quality, format", () => {
      expect(parseImageParams(params("https://x.com/a.png", "640"))).toBeNull();
      expect(parseImageParams(params("/a.svg", "640"))).toBeNull();
      expect(parseImageParams(params("/a.png", "3"))).toBeNull();
      expect(parseImageParams(params("/a.png", "abc"))).toBeNull();
      expect(parseImageParams(params("/a.png", "640", "5"))).toBeNull();
      expect(parseImageParams(params("/a.png", "640", "92", "jpeg"))).toBeNull();
      expect(parseImageParams(params("", "640"))).toBeNull();
    });
  });
});
