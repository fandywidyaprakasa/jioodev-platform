import type { Config } from "drizzle-kit";

export default {
  schema: "./src/shared/infrastructure/db/schema/index.ts",
  out: "./src/shared/infrastructure/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "",
  },
  verbose: true,
  strict: true,
} satisfies Config;