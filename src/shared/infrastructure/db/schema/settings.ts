// TARGET SCHEMA (Drizzle + PostgreSQL) — requires `pnpm add drizzle-orm` (approval needed).
// PocketBase IDs are TEXT (15-char) and are retained as PRIMARY KEY to avoid breaking
// published slugs / relations. See ARCHITECTURE-AUDIT-AND-MIGRATION-PLAN.md §5.
import {
  boolean,
  jsonb,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export const settings = pgTable("settings", {
  id: text("id").primaryKey(),
  key: text("key").notNull().unique(),
  value: jsonb("value"),
  created: timestamp("created", { withTimezone: true }).notNull().defaultNow(),
  updated: timestamp("updated", { withTimezone: true }).notNull().defaultNow(),
});

export type SettingsRow = typeof settings.$inferSelect;
export type SettingsInsert = typeof settings.$inferInsert;