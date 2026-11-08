import { createRecord, escapeFilter, listRecords } from "@/shared/infrastructure/pocketbase/pb-platform";
import type { AuditItem } from "@/shared/types";

interface PbActivity {
  id: string;
  user_id?: string;
  actor?: string;
  action?: string;
  entity_type?: string;
  entity_id?: string;
  meta?: { ip?: string; email?: string } | null;
  created: string;
}

const ACTORS = ["user", "admin", "ai", "system"];

export async function logActivity(input: {
  userId?: string;
  actor?: string;
  action: string;
  entityType?: string;
  entityId?: string;
  ip?: string;
  meta?: Record<string, unknown>;
}) {
  if (input.entityId) {
    const existing = await listRecords<PbActivity>("activity_log", {
      filter: `action='${escapeFilter(input.action)}' && entity_id='${escapeFilter(input.entityId)}'`,
      perPage: 1,
    }).catch(() => null);
    if (existing?.items?.length) return;
  }
  const rawActor = input.actor ?? "system";
  const email = rawActor.includes("@") ? rawActor : undefined;
  const adminEmails = (process.env.ALLOWED_ADMIN_EMAILS ?? "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
  const actor = ACTORS.includes(rawActor)
    ? rawActor
    : email && adminEmails.includes(email.toLowerCase())
      ? "admin"
      : input.userId
        ? "user"
        : "system";
  await createRecord<PbActivity>("activity_log", {
    ...(input.userId ? { user_id: input.userId } : {}),
    actor,
    action: input.action,
    entity_type: input.entityType ?? "",
    entity_id: input.entityId ?? "",
    meta: {
      ...(input.meta ?? {}),
      ...(input.ip ? { ip: input.ip } : {}),
      ...(email ? { email } : {}),
    },
  }).catch(() => undefined);
}

export async function listAudit(limit = 100): Promise<AuditItem[]> {
  const data = await listRecords<PbActivity>("activity_log", {
    sort: "-created",
    perPage: limit,
  });
  return data.items.map((item) => ({
    id: item.id,
    actor: item.meta?.email ?? item.actor ?? "system",
    action: item.action ?? "",
    ip: item.meta?.ip ?? "",
    createdAt: item.created,
  }));
}

export async function listUserActivity(
  userId: string,
  limit = 100,
): Promise<AuditItem[]> {
  const data = await listRecords<PbActivity>("activity_log", {
    filter: `user_id='${escapeFilter(userId)}'`,
    sort: "-created",
    perPage: limit,
  });
  return data.items.map((item) => ({
    id: item.id,
    actor: item.meta?.email ?? item.actor ?? "system",
    action: item.action ?? "",
    ip: item.meta?.ip ?? "",
    createdAt: item.created,
  }));
}
