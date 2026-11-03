import {
  createRecord,
  escapeFilter,
  listRecords,
  updateRecord,
} from "./pb-platform";

interface PbSetting {
  id: string;
  key?: string;
  value?: unknown;
}

export const DEFAULT_FLAGS: Record<string, boolean> = {
  mockAuth: false,
  autoDeploy: false,
  qrisSandbox: true,
  emailWorker: false,
};

export async function getPlatformSettings(): Promise<Record<string, unknown>> {
  const data = await listRecords<PbSetting>("settings", { perPage: 200 });
  const map: Record<string, unknown> = { ...DEFAULT_FLAGS };
  for (const item of data.items) {
    if (item.key) map[item.key] = item.value;
  }
  return map;
}

export async function savePlatformSettings(patch: Record<string, unknown>) {
  const data = await listRecords<PbSetting>("settings", { perPage: 200 });
  const existing = new Map(
    data.items.filter((item) => item.key).map((item) => [item.key as string, item]),
  );
  for (const [key, value] of Object.entries(patch)) {
    const current = existing.get(key);
    if (current) {
      await updateRecord<PbSetting>("settings", current.id, { value });
    } else {
      await createRecord<PbSetting>("settings", { key, value });
    }
  }
  return getPlatformSettings();
}

export async function getSetting<T = unknown>(
  key: string,
  fallback: T,
): Promise<T> {
  const data = await listRecords<PbSetting>("settings", {
    filter: `key='${escapeFilter(key)}'`,
    perPage: 1,
  }).catch(() => null);
  const item = data?.items[0];
  return (item?.value as T) ?? fallback;
}
