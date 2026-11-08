import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";

export const VERSION_LIMIT = 100;

export interface SiteVersionInput {
  sections: unknown;
  themeId?: string;
  tier?: "BASIC" | "PRO" | "AGENCY";
  compositionId?: string;
  pageId?: string;
}

export interface SiteVersion extends SiteVersionInput {
  version: string;
  timestamp: string;
  author: string;
  message?: string;
  hash: string;
}

function versionsRoot() {
  const library =
    process.env.JIOODEV_LIBRARY_DIR ??
    path.join(process.cwd(), "..", "library");
  return path.join(library, "versions");
}

function pageDir(projectId: string, pageId: string) {
  return path.join(versionsRoot(), projectId, pageId || "__page__");
}

function safeDirPart(value: string): boolean {
  return /^[A-Za-z0-9_-]+$/.test(value) && value.length > 0;
}

export function versionHash(input: SiteVersionInput): string {
  return `sha256:${createHash("sha256").update(JSON.stringify(input)).digest("hex")}`;
}

async function readVersion(file: string): Promise<SiteVersion | null> {
  try {
    const raw = await fs.readFile(file, "utf8");
    const parsed = JSON.parse(raw) as SiteVersion;
    if (typeof parsed.version !== "string" || !Array.isArray(parsed.sections)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

async function cleanupOldVersions(dir: string, limit: number): Promise<void> {
  const files = (await fs.readdir(dir))
    .filter((name) => name.endsWith(".json"))
    .sort();
  const excess = files.length - limit;
  if (excess <= 0) return;
  for (const name of files.slice(0, excess)) {
    await fs.rm(path.join(dir, name), { force: true });
  }
}

export async function createVersion(
  projectId: string,
  pageId: string,
  input: SiteVersionInput,
  meta: { author: string; message?: string },
): Promise<SiteVersion | null> {
  if (!safeDirPart(projectId)) return null;
  if (!safeDirPart(pageId) && pageId !== "") return null;
  const dir = pageDir(projectId, pageId);

  const hash = versionHash(input);
  const existing = await listVersions(projectId, pageId);
  if (existing[0]?.hash === hash) return existing[0];

  const sections = JSON.parse(JSON.stringify(input.sections)) as unknown;
  const now = new Date();
  const version: SiteVersion = {
    version: `${now.getTime()}-${Math.random().toString(16).slice(2, 8)}`,
    timestamp: now.toISOString(),
    author: meta.author,
    message: meta.message,
    hash,
    sections,
    themeId: input.themeId,
    tier: input.tier,
    compositionId: input.compositionId,
    pageId: input.pageId ?? (pageId || undefined),
  };

  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(
    path.join(dir, `${version.version}.json`),
    JSON.stringify(version),
  );
  await cleanupOldVersions(dir, VERSION_LIMIT);
  return version;
}

export async function listVersions(
  projectId: string,
  pageId: string,
): Promise<SiteVersion[]> {
  if (!safeDirPart(projectId) || pageId.includes("/")) return [];
  const dir = pageDir(projectId, pageId);
  let names: string[] = [];
  try {
    names = (await fs.readdir(dir)).filter((name) => name.endsWith(".json"));
  } catch {
    return [];
  }
  const versions: SiteVersion[] = [];
  for (const name of names) {
    const parsed = await readVersion(path.join(dir, name));
    if (parsed) versions.push(parsed);
  }
  versions.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  return versions;
}

export async function getRestorePayload(
  projectId: string,
  pageId: string,
  versionId: string,
): Promise<SiteVersionInput | null> {
  if (!safeDirPart(projectId) || !safeDirPart(versionId)) return null;
  if (pageId.includes("/")) return null;
  const dir = pageDir(projectId, pageId);
  const file = path.join(dir, `${versionId}.json`);
  if (!path.resolve(file).startsWith(path.resolve(dir) + path.sep)) return null;
  const version = await readVersion(file);
  if (!version) return null;
  return {
    sections: version.sections,
    themeId: version.themeId,
    tier: version.tier,
    compositionId: version.compositionId,
    pageId: version.pageId,
  };
}
