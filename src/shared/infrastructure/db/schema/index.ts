// TARGET (requires `pnpm add drizzle-orm` — approval needed before install).
// Barrel for initial Drizzle schemas (settings, packages, activity_log).
// Do not import these anywhere until the dependency is installed and the
// repository/data-store toggle (DATA_STORE=pb|pg|dual) is implemented.
export * from "./settings";
export * from "./packages";
export * from "./activity-log";