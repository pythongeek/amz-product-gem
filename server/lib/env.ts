import "dotenv/config";

function getDatabaseUrl(): string {
  const candidates = [
    process.env.DATABASE_URL,
    process.env.POSTGRES_URL_NON_POOLING,
    process.env.POSTGRES_URL,
    process.env.POSTGRES_PRISMA_URL,
  ];
  for (const url of candidates) {
    if (url) return url;
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "Missing database connection. Set one of: DATABASE_URL, POSTGRES_URL_NON_POOLING, POSTGRES_URL, POSTGRES_PRISMA_URL"
    );
  }
  return "";
}

export const env = {
  appId: process.env.APP_ID ?? "",
  appSecret: process.env.APP_SECRET ?? "",
  isProduction: process.env.NODE_ENV === "production",
  databaseUrl: getDatabaseUrl(),
  supabaseUrl: process.env.SUPABASE_URL || process.env.VITE_PUBLIC_SUPABASE_URL || "",
  supabaseServiceKey:
    process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "",
  supabaseAnonKey:
    process.env.SUPABASE_ANON_KEY || process.env.VITE_PUBLIC_SUPABASE_ANON_KEY || "",
  // AI API (Primary - Kimi Code / OpenAI-compatible)
  aiApiKey: process.env.AI_API_KEY || process.env.KIMI_API_KEY || process.env.OPENAI_API_KEY || "",
  aiBaseUrl: process.env.AI_BASE_URL || process.env.KIMI_BASE_URL || "https://api.moonshot.cn/v1",
  aiModel: process.env.AI_MODEL || process.env.KIMI_MODEL || "moonshot-v1-128k",
  // AI API (Fallback - MiniMax)
  minimaxApiKey: process.env.MINIMAX_API_KEY || "",
  minimaxBaseUrl: process.env.MINIMAX_BASE_URL || "https://api.minimax.chat/v1",
  minimaxModel: process.env.MINIMAX_MODEL || "abab6.5s-chat",
  // Cron-jobs.org
  cronJobsOrgApiKey: process.env.CRON_JOBS_ORG_API_KEY || "",
  cronSecret: process.env.CRON_SECRET || "",
  jwtSecret: process.env.JWT_SECRET ?? "fba-research-secret-key-change-in-production",
  kimiAuthUrl: process.env.KIMI_AUTH_URL ?? "https://auth.kimi.com",
  kimiOpenUrl: process.env.KIMI_OPEN_URL ?? "https://open.kimi.com",
  ownerUnionId: process.env.OWNER_UNION_ID ?? "",
};
