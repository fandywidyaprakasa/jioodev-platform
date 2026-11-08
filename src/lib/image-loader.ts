export type ImageFormat = "webp" | "avif";

export const IMAGE_API_PATH = "/api/image";

export const MIN_IMAGE_WIDTH = 8;
export const MAX_IMAGE_WIDTH = 3000;
export const MIN_IMAGE_QUALITY = 30;
export const MAX_IMAGE_QUALITY = 100;

const RASTER_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp"]);

export function isSameOriginPath(src: unknown): src is string {
  return typeof src === "string" && src.startsWith("/") && !src.startsWith("//");
}

export function isRasterExtension(src: string): boolean {
  const clean = src.split("?")[0].split("#")[0];
  const dot = clean.lastIndexOf(".");
  if (dot < 0 || dot === clean.length - 1) return false;
  return RASTER_EXTENSIONS.has(clean.slice(dot).toLowerCase());
}

export function isOptimizableImageSrc(src: unknown): src is string {
  return isSameOriginPath(src) && isRasterExtension(src);
}

export interface ImageBuildOptions {
  width: number;
  quality?: number;
  format?: ImageFormat;
}

export function isWidthInRange(width: number): boolean {
  return (
    Number.isInteger(width) && width >= MIN_IMAGE_WIDTH && width <= MAX_IMAGE_WIDTH
  );
}

export function buildImageUrl(
  src: string,
  options: ImageBuildOptions,
): string {
  if (!isOptimizableImageSrc(src)) return src;
  const { width, quality = 82, format = "webp" } = options;
  if (!isWidthInRange(width)) return src;
  if (quality < MIN_IMAGE_QUALITY || quality > MAX_IMAGE_QUALITY) return src;
  if (format !== "webp" && format !== "avif") return src;
  const params = new URLSearchParams();
  params.set("v", src);
  params.set("w", String(width));
  params.set("q", String(quality));
  params.set("f", format);
  return `${IMAGE_API_PATH}?${params.toString()}`;
}

export function getImageSrcSet(
  src: string,
  widths: readonly number[],
  options: Omit<ImageBuildOptions, "width"> = {},
): string {
  return widths
    .filter((width) => isWidthInRange(width))
    .map((width) => `${buildImageUrl(src, { ...options, width })} ${width}w`)
    .join(", ");
}

export function getImageSizes(sizes?: string): string {
  return sizes ?? "(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw";
}

export interface ImageRouteParams {
  src: string;
  width: number;
  quality: number;
  format: ImageFormat;
}

export function parseImageParams(
  searchParams: URLSearchParams,
): ImageRouteParams | null {
  const src = searchParams.get("v");
  if (!src || !isOptimizableImageSrc(src)) return null;
  const width = Number(searchParams.get("w"));
  if (!Number.isInteger(width) || !isWidthInRange(width)) return null;
  const quality = Number(searchParams.get("q") ?? 82);
  if (!Number.isInteger(quality) || quality < MIN_IMAGE_QUALITY || quality > MAX_IMAGE_QUALITY) {
    return null;
  }
  const format = searchParams.get("f") ?? "webp";
  if (format !== "webp" && format !== "avif") return null;
  return { src, width, quality, format };
}

export interface LibraryPathResolution {
  kind: "themes" | "templates";
  id: string;
  parts: string[];
}

const LIBRARY_ROOTS = new Set(["themes", "templates"]);
const SAFE_PART = /^[A-Za-z0-9._-]+$/;

export function resolveLibraryPath(
  src: string,
): LibraryPathResolution | null {
  const clean = src.split("?")[0].split("#")[0];
  const parts = clean.replace(/^\/+/, "/").slice(1).split("/").filter(Boolean);
  if (parts.length < 2) return null;
  const [root, id, ...rest] = parts;
  if (!root || !LIBRARY_ROOTS.has(root)) return null;
  if (!id || !/^[A-Za-z0-9_-]+$/.test(id) || id.startsWith("_")) return null;
  if (rest.length < 1) return null;
  for (const part of rest) {
    if (part === "." || part === ".." || !SAFE_PART.test(part)) return null;
  }
  if (!isRasterExtension(clean)) return null;
  return {
    kind: root as LibraryPathResolution["kind"],
    id,
    parts: rest,
  };
}
