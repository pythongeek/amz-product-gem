import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { env } from "../lib/env";
import * as schema from "@db/schema";
import * as relations from "@db/relations";

const fullSchema = { ...schema, ...relations };

let instance: ReturnType<typeof drizzle<typeof fullSchema>>;

export function getDb() {
  if (!instance) {
    const isPooler = env.databaseUrl.includes("pooler") || env.databaseUrl.includes("pgbouncer");

    const pool = new Pool({
      connectionString: env.databaseUrl,
      ssl: env.isProduction ? { rejectUnauthorized: false } : false,
      // PgBouncer transaction pooler needs these settings
      ...(isPooler
        ? {
            // Use session mode for DDL, or add prepareThreshold for transaction pooler
            keepAlive: true,
            connectionTimeoutMillis: 30000,
            idleTimeoutMillis: 30000,
          }
        : {}),
    });

    instance = drizzle(pool, { schema: fullSchema });
  }
  return instance;
}
