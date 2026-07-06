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

export const env = {
  appId: process.env.APP_ID ?? "",
  appSecret: process.env.APP_SECRET ?? "",
  isProduction: process.env.NODE_ENV === "production",
  // DATABASE_URL with fallbacks for common Supabase env var names
  databaseUrl: required("DATABASE_URL", "POSTGRES_PRISMA_URL", "POSTGRES_URL"),
  supabaseUrl: required("SUPABASE_URL", "VITE_PUBLIC_SUPABASE_URL"),
  // SUPABASE_SERVICE_KEY or SUPABASE_SERVICE_ROLE_KEY
  supabaseServiceKey: required("SUPABASE_SERVICE_KEY", "SUPABASE_SERVICE_ROLE_KEY"),
  supabaseAnonKey: required("SUPABASE_ANON_KEY", "VITE_PUBLIC_SUPABASE_ANON_KEY"),
  kimiApiKey: process.env.KIMI_API_KEY ?? "",
  kimiBaseUrl: process.env.KIMI_BASE_URL ?? "https://api.moonshot.cn/v1",
  jwtSecret: process.env.JWT_SECRET ?? "fba-research-secret-key-change-in-production",
  // Legacy env vars (for template compatibility)
  kimiAuthUrl: process.env.KIMI_AUTH_URL ?? "https://auth.kimi.com",
  kimiOpenUrl: process.env.KIMI_OPEN_URL ?? "https://open.kimi.com",
  ownerUnionId: process.env.OWNER_UNION_ID ?? "",
};
