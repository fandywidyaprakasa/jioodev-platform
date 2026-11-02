import { pbAdminToken } from "@/modules/auth/pocketbase";

const PB = process.env.POCKETBASE_PLATFORM_URL ?? "";

export class PbError extends Error {
  status: number;
  data: unknown;
  constructor(status: number, message: string, data?: unknown) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

async function pbFetch<T>(
  path: string,
  init?: RequestInit & { admin?: boolean },
): Promise<T> {
  if (!PB) throw new PbError(500, "POCKETBASE_PLATFORM_URL belum diset.");
  const token = init?.admin === false ? null : await pbAdminToken();
  const res = await fetch(`${PB}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(token ? { Authorization: token } : {}),
      ...init?.headers,
    },
    cache: "no-store",
  });
  const text = await res.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!res.ok) {
    const message =
      (data as { message?: string } | null)?.message ??
      `PocketBase request gagal (${res.status})`;
    throw new PbError(res.status, message, data);
  }
  return data as T;
}

export interface PbList<T> {
  page: number;
  perPage: number;
  totalItems: number;
  totalPages: number;
  items: T[];
}

export function escapeFilter(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

export async function listRecords<T>(
  collection: string,
  params: { filter?: string; sort?: string; perPage?: number; page?: number } = {},
): Promise<PbList<T>> {
  const search = new URLSearchParams();
  if (params.filter) search.set("filter", params.filter);
  if (params.sort) search.set("sort", params.sort);
  search.set("perPage", String(params.perPage ?? 100));
  search.set("page", String(params.page ?? 1));
  return pbFetch<PbList<T>>(`/api/collections/${collection}/records?${search}`);
}

export async function getRecord<T>(collection: string, id: string): Promise<T> {
  return pbFetch<T>(`/api/collections/${collection}/records/${encodeURIComponent(id)}`);
}

export async function createRecord<T>(collection: string, body: unknown): Promise<T> {
  return pbFetch<T>(`/api/collections/${collection}/records`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function updateRecord<T>(
  collection: string,
  id: string,
  body: unknown,
): Promise<T> {
  return pbFetch<T>(`/api/collections/${collection}/records/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export async function deleteRecord(collection: string, id: string): Promise<void> {
  await pbFetch(`/api/collections/${collection}/records/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}
