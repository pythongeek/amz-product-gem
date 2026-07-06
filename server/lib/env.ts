import "dotenv/config";

function required(name: string, ...fallbacks: string[]): string {
  let value = process.env[name];
  if (!value) {
    for (const fb of fallbacks) {
      value = process.env[fb];
      if (value) break;
    }
  }
  if (!value && process.env.NODE_ENV === "production") {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value ?? "";
}

function buildDirectUrl(): string {
  const host = process.env.POSTGRES_HOST || "";
  const user = process.env.POSTGRES_USER || "postgres";
  const pass = process.env.POSTGRES_PASSWORD || "";
  const db = process.env.POSTGRES_DATABASE || "postgres";
  if (!host || !pass) return "";
  return `postgres://${user}:${pass}@${host}:5432/${db}?sslmode=require`;
}

export const env = {
  appId: process.env.APP_ID ?? "",
  appSecret: process.env.APP_SECRET ?? "",
  isProduction: process.env.NODE_ENV === "production",
  databaseUrl: required(
    "DATABASE_URL",
    buildDirectUrl(),
    "POSTGRES_URL_NON_POOLING",
    "POSTGRES_URL",
    "POSTGRES_PRISMA_URL"
  ),
  supabaseUrl: required("SUPABASE_URL", "VITE_PUBLIC_SUPABASE_URL"),
  supabaseServiceKey: required("SUPABASE_SERVICE_KEY", "SUPABASE_SERVICE_ROLE_KEY"),
  supabaseAnonKey: required("SUPABASE_ANON_KEY", "VITE_PUBLIC_SUPABASE_ANON_KEY"),
  kimiApiKey: process.env.KIMI_API_KEY ?? "",
  kimiBaseUrl: process.env.KIMI_BASE_URL ?? "https://api.moonshot.cn/v1",
  jwtSecret: process.env.JWT_SECRET ?? "fba-research-secret-key-change-in-production",
  kimiAuthUrl: process.env.KIMI_AUTH_URL ?? "https://auth.kimi.com",
  kimiOpenUrl: process.env.KIMI_OPEN_URL ?? "https://open.kimi.com",
  ownerUnionId: process.env.OWNER_UNION_ID ?? "",
};
