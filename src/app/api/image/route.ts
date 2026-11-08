import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { parseImageParams, resolveLibraryPath } from "@/lib/image-loader";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_SOURCE_BYTES = 25 * 1024 * 1024;
const IMMUTABLE_CACHE = "public, max-age=31536000, immutable";

function libraryRoot() {
  return (
    process.env.JIOODEV_LIBRARY_DIR ??
    path.join(process.cwd(), "..", "library")
  );
}

const FORMAT_TYPES: Record<string, string> = {
  webp: "image/webp",
  avif: "image/avif",
};

export async function GET(request: Request) {
  const url = new URL(request.url);
  const params = parseImageParams(url.searchParams);
  if (!params) {
    return new Response("Bad request", { status: 400 });
  }

  const resolved = resolveLibraryPath(params.src);
  if (!resolved) {
    return new Response("Bad request", { status: 400 });
  }

  const dir =
    resolved.kind === "themes"
      ? path.join(libraryRoot(), "themes", resolved.id)
      : path.join(libraryRoot(), "templates", resolved.id);
  const file = path.join(dir, ...resolved.parts);
  if (!path.resolve(file).startsWith(path.resolve(dir) + path.sep)) {
    return new Response("Bad request", { status: 400 });
  }

  let source: Buffer;
  try {
    source = await fs.readFile(file);
  } catch {
    return new Response("Not found", { status: 404 });
  }
  if (source.byteLength === 0 || source.byteLength > MAX_SOURCE_BYTES) {
    return new Response("Not found", { status: 404 });
  }

  const etag = `"img-${createHash("sha256").update(source).digest("hex").slice(0, 24)}-${params.width}-${params.quality}-${params.format}"`;
  const ifNoneMatch = request.headers.get("if-none-match");
  if (ifNoneMatch && ifNoneMatch === etag) {
    return new Response(null, {
      status: 304,
      headers: { ETag: etag, "Cache-Control": IMMUTABLE_CACHE },
    });
  }

  try {
    const body = await sharp(source)
      .resize({ width: params.width, withoutEnlargement: true })
      .toFormat(params.format, { quality: params.quality })
      .toBuffer();
    return new Response(new Uint8Array(body), {
      headers: {
        "Content-Type": FORMAT_TYPES[params.format],
        "Cache-Control": IMMUTABLE_CACHE,
        ETag: etag,
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
