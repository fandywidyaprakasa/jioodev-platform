import {
  createRecord,
  escapeFilter,
  listRecords,
  updateRecord,
} from "./pocketbase/pb-platform";

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
  const map: Record<string, unknown> = { ...DEFAULT_FLAGS };
  if (postgresEnabled()) {
    const rows = await pgListSettings();
    for (const item of rows) {
      if (item.key) map[item.key] = item.value;
    }
    if (pocketBaseEnabled()) {
      const data = await listRecords<PbSetting>("settings", { perPage: 200 }).catch(() => null);
      for (const item of data?.items ?? []) {
        if (item.key) map[item.key] = item.value;
      }
    }
    return map;
  }
  const data = await listRecords<PbSetting>("settings", { perPage: 200 });
  for (const item of data.items) {
    if (item.key) map[item.key] = item.value;
  }
  return map;
}

export async function savePlatformSettings(patch: Record<string, unknown>) {
  if (postgresEnabled()) {
    await pgSaveSettings(patch);
    if (pocketBaseEnabled()) {
      const data = await listRecords<PbSetting>("settings", { perPage: 200 }).catch(() => null);
      const existing = new Map(
        (data?.items ?? []).filter((item) => item.key).map((item) => [item.key as string, item]),
      );
      for (const [key, value] of Object.entries(patch)) {
        const current = existing.get(key);
        if (current) {
          await updateRecord<PbSetting>("settings", current.id, { value }).catch(() => null);
        } else {
          await createRecord<PbSetting>("settings", { key, value }).catch(() => null);
        }
      }
    }
    return getPlatformSettings();
  }
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
  if (postgresEnabled()) {
    const value = await pgGetSetting<T>(key, fallback);
    if (value !== fallback) return value;
    if (pocketBaseEnabled()) {
      const data = await listRecords<PbSetting>("settings", {
        filter: `key='${escapeFilter(key)}'`,
        perPage: 1,
      }).catch(() => null);
      const item = data?.items[0];
      if (item?.value !== undefined) return (item.value as T) ?? fallback;
    }
    return fallback;
  }
  const data = await listRecords<PbSetting>("settings", {
    filter: `key='${escapeFilter(key)}'`,
    perPage: 1,
  }).catch(() => null);
  const item = data?.items[0];
  return (item?.value as T) ?? fallback;
}

// --- Postgres (Drizzle) path, used when DATA_STORE=pg|dual ---
import { getPostgresDb } from "./db/client";
import { pocketBaseEnabled, postgresEnabled } from "./data-store";

async function pgListSettings() {
  const { eq } = await import("drizzle-orm");
  const { settings: settingsTable } = await import("./db/schema");
  const db = await getPostgresDb();
  if (!db) return [];
  return db.select().from(settingsTable);
}

async function pgGetSetting<T>(key: string, fallback: T): Promise<T> {
  const { eq } = await import("drizzle-orm");
  const { settings: settingsTable } = await import("./db/schema");
  const db = await getPostgresDb();
  if (!db) return fallback;
  const rows = await db
    .select()
    .from(settingsTable)
    .where(eq(settingsTable.key, key))
    .limit(1);
  return (rows[0]?.value as T) ?? fallback;
}

async function pgSaveSettings(patch: Record<string, unknown>) {
  const { eq } = await import("drizzle-orm");
  const { settings: settingsTable } = await import("./db/schema");
  const db = await getPostgresDb();
  if (!db) return;
  const existing = (await db.select().from(settingsTable)) as Array<{ id: string; key: string | null; value: unknown }>;
  const byKey = new Map(existing.map((r: any) => [r.key, r]));
  for (const [key, value] of Object.entries(patch)) {
    const current = byKey.get(key);
    if (current) {
      await db
        .update(settingsTable)
        .set({ value, updated: new Date() })
        .where(eq(settingsTable.id, current.id));
    } else {
      const id = `set_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      await db.insert(settingsTable).values({ id, key, value });
    }
  }
}
