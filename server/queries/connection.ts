import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { env } from "../lib/env";
import * as schema from "@db/schema";
import * as relations from "@db/relations";

const fullSchema = { ...schema, ...relations };

let instance: ReturnType<typeof drizzle<typeof fullSchema>>;
let rawPool: Pool | null = null;

export function getDb() {
  if (!instance) {
    const pool = new Pool({
      connectionString: env.databaseUrl,
      ssl: env.isProduction ? { rejectUnauthorized: false } : false,
      // Disable prepared statements for PgBouncer compatibility
      prepareThreshold: 0,
      connectionTimeoutMillis: 30000,
      idleTimeoutMillis: 30000,
    });

    instance = drizzle(pool, { schema: fullSchema });
    rawPool = pool;
  }
  return instance;
}

export function getRawPool(): Pool {
  if (!rawPool) {
    getDb(); // initialize pool
  }
  return rawPool!;
}
