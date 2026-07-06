import "dotenv/config";

function getEnvVar(name: string, ...fallbacks: string[]): string {
  let value = process.env[name];
  if (value) return value;
  for (const fb of fallbacks) {
    value = process.env[fb];
    if (value) return value;
  }
  return "";
}

function buildDirectDbUrl(): string {
  const host = process.env.POSTGRES_HOST || "";
  const user = process.env.POSTGRES_USER || process.env.PGUSER || "postgres";
  const pass = process.env.POSTGRES_PASSWORD || process.env.PGPASSWORD || "";
  const db = process.env.POSTGRES_DATABASE || process.env.PGDATABASE || "postgres";
  if (!host || !pass) return "";
  // Note: sslmode is handled by the Pool config, not in the connection string
  return `postgres://${user}:${pass}@${host}:5432/${db}`;
}

function getDatabaseUrl(): string {
  // 1. Explicit DATABASE_URL if set
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;

  // 2. DIRECT_DATABASE_URL (explicit override for direct connection)
  if (process.env.DIRECT_DATABASE_URL) return process.env.DIRECT_DATABASE_URL;

  // 3. Build direct URL from individual env vars (bypasses poolers)
  const directUrl = buildDirectDbUrl();
  if (directUrl) return directUrl;

  // 4. Fall back to Supabase-provided URLs (will likely fail with PgBouncer)
  const fallback = getEnvVar(
    "POSTGRES_URL_NON_POOLING",
    "POSTGRES_URL",
    "POSTGRES_PRISMA_URL"
  );
  if (fallback) return fallback;

  // 5. Production must have a connection
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "Missing database connection. Set one of: DATABASE_URL, DIRECT_DATABASE_URL, POSTGRES_HOST+POSTGRES_PASSWORD, POSTGRES_URL_NON_POOLING"
    );
  }

  return "";
}

export const env = {
  appId: process.env.APP_ID ?? "",
  appSecret: process.env.APP_SECRET ?? "",
  isProduction: process.env.NODE_ENV === "production",
  databaseUrl: getDatabaseUrl(),
  supabaseUrl: getEnvVar("SUPABASE_URL", "VITE_PUBLIC_SUPABASE_URL"),
  supabaseServiceKey: getEnvVar("SUPABASE_SERVICE_KEY", "SUPABASE_SERVICE_ROLE_KEY"),
  supabaseAnonKey: getEnvVar("SUPABASE_ANON_KEY", "VITE_PUBLIC_SUPABASE_ANON_KEY"),
  kimiApiKey: process.env.KIMI_API_KEY ?? "",
  kimiBaseUrl: process.env.KIMI_BASE_URL ?? "https://api.moonshot.cn/v1",
  jwtSecret: process.env.JWT_SECRET ?? "fba-research-secret-key-change-in-production",
  kimiAuthUrl: process.env.KIMI_AUTH_URL ?? "https://auth.kimi.com",
  kimiOpenUrl: process.env.KIMI_OPEN_URL ?? "https://open.kimi.com",
  ownerUnionId: process.env.OWNER_UNION_ID ?? "",
};
