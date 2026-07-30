import dotenv from "dotenv";
import path from "path";
import fs from "fs";

// Search upwards for .env file to support monorepo directory execution
const findEnv = () => {
  const paths = [
    path.join(process.cwd(), ".env"),
    path.join(process.cwd(), "..", ".env"),
    path.join(process.cwd(), "..", "..", ".env"),
  ];
  for (const p of paths) {
    if (fs.existsSync(p)) return p;
  }
  return null;
};

const envPath = findEnv();
if (envPath) {
  dotenv.config({ path: envPath });
}

import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

export let pool: pg.Pool = null as any;
export let db: NodePgDatabase<typeof schema> = null as any;

if (!process.env.DATABASE_URL) {
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "DATABASE_URL must be set in production.",
    );
  } else {
    console.warn(
      "WARNING: DATABASE_URL is not set. Database functionality will be offline.",
    );
  }
} else {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    connectionTimeoutMillis: 1500, // Fail fast in 1.5s if DB is offline/suspended
    ssl: process.env.DATABASE_URL.includes("ssl=true")
      ? { rejectUnauthorized: false }
      : undefined,
  });
  db = drizzle(pool, { schema });
}

export * from "./schema";
export * from "./defaultTools";
