// PostgreSQL client (Drizzle). Only active when DATABASE_URL is set.
// Heavy dependencies (pg, drizzle-orm) are loaded lazily so tests/paths that
// never touch Postgres do not pay their import cost.
import type { Pool as PgPool } from "pg";

type DrizzleDb = any;

let pool: PgPool | null = null;
let db: DrizzleDb = null;

export async function getPostgresPool(): Promise<PgPool | null> {
  if (pool) return pool;
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  const { Pool } = await import("pg");
  pool = new Pool({ connectionString: url, max: 10 });
  return pool;
}

export async function getPostgresDb() {
  if (db) return db;
  const p = await getPostgresPool();
  if (!p) return null;
  const { drizzle } = await import("drizzle-orm/node-postgres");
  const schema = await import("./schema");
  db = drizzle(p, { schema });
  return db;
}

export function postgresConfigured() {
  return Boolean(process.env.DATABASE_URL);
}