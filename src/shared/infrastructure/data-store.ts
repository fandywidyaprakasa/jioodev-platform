export type DataStore = "pb" | "pg" | "dual";

export function getDataStore(): DataStore {
  const v = (process.env.DATA_STORE ?? "pb").toLowerCase();
  if (v === "pg" || v === "dual") return v;
  return "pb";
}

export function postgresEnabled() {
  return getDataStore() === "pg" || getDataStore() === "dual";
}

export function pocketBaseEnabled() {
  return getDataStore() === "pb" || getDataStore() === "dual";
}