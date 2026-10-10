import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

// This connection is only ever used for anonymous, best-effort usage
// analytics (see src/db/schema.ts). The app's core feature — explaining a
// text to the user — must never depend on it. If DATABASE_URL is missing or
// the database is unreachable, we simply disable analytics instead of
// crashing every API route that happens to import this module.
const databaseUrl = process.env.DATABASE_URL;

const globalForDb = globalThis as typeof globalThis & {
  __arenaNextJsPostgresqlPool?: Pool;
};

export const pool = databaseUrl
  ? (globalForDb.__arenaNextJsPostgresqlPool ??
    new Pool({
      connectionString: databaseUrl,
    }))
  : null;

if (pool && process.env.NODE_ENV !== "production") {
  globalForDb.__arenaNextJsPostgresqlPool = pool;
}

if (pool) {
  // Never let a dropped connection crash the process.
  pool.on("error", () => {});
}

export const db = pool ? drizzle(pool) : null;
