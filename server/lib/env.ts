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

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET || process.env.SUPABASE_JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("CRITICAL SECURITY ERROR: JWT_SECRET or SUPABASE_JWT_SECRET environment variable must be set in production!");
    }
    return "fba-research-secret-key-change-in-production";
  }
  if (secret === "fba-research-secret-key-change-in-production" && process.env.NODE_ENV === "production") {
    throw new Error("CRITICAL SECURITY ERROR: Do not use the default fallback JWT_SECRET in production!");
  }
  return secret;
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
    process.env.SUPABASE_ANON_KEY ||
    process.env.VITE_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    process.env.VITE_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    "",
  // AI API (Primary - MiniMax)
  // Uses Anthropic-compatible /v1/messages format with x-api-key header
  // Base URL: https://api.minimax.io/anthropic  |  Model: MiniMax-M3
  // NOTE: We hardcode the Anthropic endpoint because the OpenAI-compatible
  // endpoint (/v1) does NOT work with x-api-key auth. Only /anthropic works.
  minimaxApiKey: process.env.MINIMAX_API_KEY || "",
  minimaxBaseUrl: "https://api.minimax.io/anthropic",
  minimaxModel: process.env.MINIMAX_MODEL || "MiniMax-M3",
  // AI API (Fallback - Kimi Code, disabled until format is known)
  // Uses Claude-compatible /v1/messages format with x-api-key auth
  // Base URL: https://api.kimi.com/coding/  |  Model: kimi-code
  aiApiKey: process.env.AI_API_KEY || process.env.KIMI_API_KEY || "",
  aiBaseUrl: process.env.AI_BASE_URL || process.env.KIMI_BASE_URL || "https://api.kimi.com/coding",
  aiModel: process.env.AI_MODEL || process.env.KIMI_MODEL || "kimi-code",
  aiFormat: (process.env.AI_FORMAT || process.env.KIMI_FORMAT || "") as "openai" | "claude" | "",
  // Cron-jobs.org
  cronJobsOrgApiKey: process.env.CRON_JOBS_ORG_API_KEY || "",
  cronSecret: process.env.CRON_SECRET || "",
  jwtSecret: getJwtSecret(),
  kimiAuthUrl: process.env.KIMI_AUTH_URL ?? "https://auth.kimi.com",
  kimiOpenUrl: process.env.KIMI_OPEN_URL ?? "https://open.kimi.com",
  ownerUnionId: process.env.OWNER_UNION_ID ?? "",
  awsAccessKey: process.env.AWS_ACCESS_KEY || "",
  awsSecretKey: process.env.AWS_SECRET_KEY || "",
  associateTag: process.env.ASSOCIATE_TAG || "",
  awsRegion: process.env.AWS_REGION || "us-east-1",
  rainforestApiKey: process.env.RAINFOREST_API_KEY || "",
};
