import {
  createRecordWithFile,
  escapeFilter,
  getRecord,
  listRecords,
} from "@/shared/infrastructure/pocketbase/pb-platform";
import { pbAdminToken } from "@/shared/infrastructure/pocketbase/admin-token";
import type { ProjectAsset } from "@/shared/types";

interface PbAsset {
  id: string;
  project_id?: string;
  type?: string;
  file?: string;
  meta?: { name?: string; size?: number; mime?: string } | null;
  created: string;
}

export type { ProjectAsset };

export async function listProjectAssets(
  projectId: string,
): Promise<ProjectAsset[]> {
  const data = await listRecords<PbAsset>("content_assets", {
    filter: `project_id='${escapeFilter(projectId)}' && type='image'`,
    sort: "-created",
    perPage: 100,
  }).catch(() => null);
  return (data?.items ?? []).map((item) => ({
    id: item.id,
    name: item.meta?.name ?? item.file ?? "asset",
    url: item.file ? `/api/projects/${projectId}/assets/${item.id}/file` : "",
    size: item.meta?.size ?? 0,
    createdAt: item.created,
  }));
}

export async function getProjectAssetFile(
  projectId: string,
  assetId: string,
): Promise<{ stream: ReadableStream<Uint8Array> | null; contentType: string } | null> {
  const asset = await getRecord<PbAsset>("content_assets", assetId).catch(
    () => null,
  );
  if (!asset || asset.project_id !== projectId || !asset.file) return null;

  const base = process.env.POCKETBASE_PLATFORM_URL ?? "";
  const token = await pbAdminToken();
  const response = await fetch(
    `${base}/api/files/content_assets/${asset.id}/${asset.file}`,
    { headers: { Authorization: token }, cache: "no-store" },
  );
  if (!response.ok) return null;
  return {
    stream: response.body,
    contentType:
      response.headers.get("content-type") ?? "application/octet-stream",
  };
}

export async function uploadProjectAsset(
  projectId: string,
  file: File,
): Promise<ProjectAsset> {
  const form = new FormData();
  form.set("project_id", projectId);
  form.set("type", "image");
  form.set("file", file);
  form.set(
    "meta",
    JSON.stringify({ name: file.name, size: file.size, mime: file.type }),
  );
  const record = await createRecordWithFile<PbAsset>("content_assets", form);
  return {
    id: record.id,
    name: record.meta?.name ?? file.name,
    url: record.file
      ? `/api/projects/${projectId}/assets/${record.id}/file`
      : "",
    size: record.meta?.size ?? file.size,
    createdAt: record.created,
  };
}
