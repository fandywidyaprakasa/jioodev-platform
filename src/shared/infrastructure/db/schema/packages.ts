// TARGET SCHEMA (Drizzle + PostgreSQL) — requires `pnpm add drizzle-orm` (approval needed).
// PocketBase IDs are TEXT (15-char) and are retained as PRIMARY KEY.
import {
  boolean,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export const packages = pgTable("packages", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type"),
  quotaLanding: integer("quota_landing"),
  quotaWeb: integer("quota_web"),
  price: numeric("price"),
  durationDays: integer("duration_days"),
  maxSections: integer("max_sections"),
  jsAllowed: boolean("js_allowed"),
  cms: boolean("cms"),
  customDomain: boolean("custom_domain"),
  deployIncluded: integer("deploy_included"),
  validFrom: timestamp("valid_from", { withTimezone: true }),
  validUntil: timestamp("valid_until", { withTimezone: true }),
  status: text("status"),
  features: jsonb("features"),
  isActive: boolean("is_active"),
  sortOrder: integer("sort_order"),
  created: timestamp("created", { withTimezone: true }).notNull().defaultNow(),
  updated: timestamp("updated", { withTimezone: true }).notNull().defaultNow(),
});

export type PackageRow = typeof packages.$inferSelect;
export type PackageInsert = typeof packages.$inferInsert;