import { promises as fs } from "node:fs";
import path from "node:path";

const TYPES: Record<string, string> = {
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".ttf": "font/ttf",
  ".eot": "application/vnd.ms-fontobject",
};

async function readFile(file: string) {
  try {
    const data = await fs.readFile(file);
    const type = TYPES[path.extname(file).toLowerCase()] ?? "application/octet-stream";
    return { data, type };
  } catch {
    return null;
  }
}

function templateRoot() {
  return (
    process.env.JIOODEV_LIBRARY_DIR ??
    path.join(process.cwd(), "..", "library")
  );
}

export async function readTemplateFile(
  code: string,
  kind: "assets" | "shared",
  parts: string[],
) {
  if (!/^[A-Za-z0-9-]+$/.test(code)) return null;
  const dir =
    kind === "shared"
      ? path.join(templateRoot(), "templates", "_shared")
      : path.join(templateRoot(), "templates", code, "assets");
  const file = path.join(dir, ...parts);
  if (!path.resolve(file).startsWith(path.resolve(dir) + path.sep)) return null;
  return readFile(file);
}

export async function readTemplatePath(code: string, parts: string[]) {
  if (!/^[A-Za-z0-9-]+$/.test(code)) return null;
  const dir = path.join(templateRoot(), "templates", code);
  const file = path.join(dir, ...parts);
  if (!path.resolve(file).startsWith(path.resolve(dir) + path.sep)) return null;
  return readFile(file);
}

export async function readThemePath(themeId: string, parts: string[]) {
  if (!/^[A-Za-z0-9-]+$/.test(themeId)) return null;
  const dir = path.join(templateRoot(), "themes", themeId);
  const file = path.join(dir, ...parts);
  if (!path.resolve(file).startsWith(path.resolve(dir) + path.sep)) return null;
  return readFile(file);
}
