// TARGET SCHEMA (Drizzle + PostgreSQL) — requires `pnpm add drizzle-orm` (approval needed).
// PocketBase IDs are TEXT (15-char) and are retained as PRIMARY KEY.
import {
  jsonb,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export const activityLog = pgTable("activity_log", {
  id: text("id").primaryKey(),
  userId: text("user_id"),
  actor: text("actor"),
  action: text("action").notNull(),
  entityType: text("entity_type"),
  entityId: text("entity_id"),
  meta: jsonb("meta"),
  created: timestamp("created", { withTimezone: true }).notNull().defaultNow(),
  updated: timestamp("updated", { withTimezone: true }).notNull().defaultNow(),
});

export type ActivityLogRow = typeof activityLog.$inferSelect;
export type ActivityLogInsert = typeof activityLog.$inferInsert;