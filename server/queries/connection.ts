import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { env } from "../lib/env";
import * as schema from "@db/schema";
import * as relations from "@db/relations";

const fullSchema = { ...schema, ...relations };

let instance: ReturnType<typeof drizzle<typeof fullSchema>>;
let rawPool: Pool | null = null;

function stripSslmode(url: string): string {
  try {
    const u = new URL(url);
    u.searchParams.delete("sslmode");
    return u.toString();
  } catch {
    return url;
  }
}

export function getDb() {
  if (!instance) {
    const cleanUrl = stripSslmode(env.databaseUrl);

    const pool = new Pool({
      connectionString: cleanUrl,
      // Always allow self-signed certs (Supabase uses them)
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
