import {
  createRecord,
  escapeFilter,
  listRecords,
  updateRecord,
} from "./pb-platform";
import type { CopyField } from "@/shared/types";

interface PbAsset {
  id: string;
  project_id?: string;
  type?: string;
  meta?: { fields?: CopyField[] } | null;
}

async function findCopyAsset(projectId: string) {
  const data = await listRecords<PbAsset>("content_assets", {
    filter: `project_id='${escapeFilter(projectId)}' && type='text'`,
    perPage: 1,
  });
  return data.items[0] ?? null;
}

export async function getProjectCopy(
  projectId: string,
  fallback: CopyField[],
): Promise<CopyField[]> {
  try {
    const asset = await findCopyAsset(projectId);
    const fields = asset?.meta?.fields;
    if (Array.isArray(fields) && fields.length) {
      const byKey = new Map(fields.map((field) => [field.key, field]));
      return fallback.map((field) => byKey.get(field.key) ?? field);
    }
    return fallback;
  } catch {
    return fallback;
  }
}

export async function saveProjectCopy(
  projectId: string,
  fields: CopyField[],
): Promise<CopyField[]> {
  const existing = await findCopyAsset(projectId);
  const payload = {
    project_id: projectId,
    type: "text",
    meta: { fields },
  };
  if (existing) {
    await updateRecord<PbAsset>("content_assets", existing.id, payload);
  } else {
    await createRecord<PbAsset>("content_assets", payload);
  }
  return fields;
}
