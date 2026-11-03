import {
  createRecordWithFile,
  escapeFilter,
  listRecords,
} from "./pb-platform";

interface PbAsset {
  id: string;
  project_id?: string;
  type?: string;
  file?: string;
  meta?: { name?: string; size?: number; mime?: string } | null;
  created: string;
}

export interface ProjectAsset {
  id: string;
  name: string;
  url: string;
  size: number;
  createdAt: string;
}

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
