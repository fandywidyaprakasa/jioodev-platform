import { promises as fs } from "node:fs";
import path from "node:path";
import { resolvePreview } from "@/modules/preview";

const TYPES: Record<string, string> = {
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".woff2": "font/woff2",
};

export async function GET(
  _request: Request,
  props: { params: Promise<{ token: string; path: string[] }> }
) {
  const params = await props.params;
  const context = await resolvePreview(params.token).catch(() => null);
  if (!context) return new Response("Not found", { status: 404 });

  const root =
    process.env.JIOODEV_LIBRARY_DIR ??
    path.join(process.cwd(), "..", "library");
  const dir = path.join(root, "templates", context.template, "assets");
  const file = path.join(dir, ...params.path);
  if (!path.resolve(file).startsWith(path.resolve(dir) + path.sep)) {
    return new Response("Not found", { status: 404 });
  }

  try {
    const data = await fs.readFile(file);
    const type = TYPES[path.extname(file).toLowerCase()] ?? "application/octet-stream";
    return new Response(data, {
      headers: { "Content-Type": type, "Cache-Control": "public, max-age=3600" },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
