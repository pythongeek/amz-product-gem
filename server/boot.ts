import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import type { HttpBindings } from "@hono/node-server";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "./router";
import { createContext } from "./context";
import { env } from "./lib/env";
import cronRouter from "./cron-router";

import { getRawPool } from "./queries/connection";

const app = new Hono<{ Bindings: HttpBindings }>();

app.use(bodyLimit({ maxSize: 50 * 1024 * 1024 }));

// Health check
app.get("/api/health", (c) => c.json({ status: "ok", time: new Date().toISOString() }));

// DB diagnostic
app.get("/api/debug/db", async (c) => {
  try {
    const pool = getRawPool();
    const result = await pool.query("SELECT current_database(), current_user, version()");
    const redactedUrl = env.databaseUrl.replace(/:([^:@]+)@/, ":****@");
    return c.json({ ok: true, dbInfo: result.rows[0], connectionString: redactedUrl });
  } catch (err: any) {
    const redactedUrl = env.databaseUrl.replace(/:([^:@]+)@/, ":****@");
    return c.json({ ok: false, error: err.message, code: err.code, connectionString: redactedUrl }, 500);
  }
});

// Test admin table
app.get("/api/debug/admin-table", async (c) => {
  try {
    const pool = getRawPool();
    const result = await pool.query("SELECT count(*) FROM admin_credentials");
    return c.json({ ok: true, count: result.rows[0] });
  } catch (err: any) {
    return c.json({ ok: false, error: err.message, code: err.code }, 500);
  }
});

// AI API config debug (redacted)
app.get("/api/debug/ai-config", async (c) => {
  return c.json({
    ok: true,
    minimax: {
      baseUrl: env.minimaxBaseUrl,
      model: env.minimaxModel,
      apiKeySet: !!env.minimaxApiKey,
      apiKeyLength: env.minimaxApiKey?.length || 0,
      apiKeyPrefix: env.minimaxApiKey?.substring(0, 10) || "none",
    },
    kimi: {
      baseUrl: env.aiBaseUrl,
      model: env.aiModel,
      apiKeySet: !!env.aiApiKey,
      apiKeyLength: env.aiApiKey?.length || 0,
    },
  });
});

// Test AI API directly
app.get("/api/debug/ai-test", async (c) => {
  try {
    const { callAIWithFallback } = await import("./lib/ai");
    const result = await callAIWithFallback([
      { role: "system", content: "You are a helpful assistant." },
      { role: "user", content: "Say 'API is working' in Bangla." },
    ]);
    return c.json({ ok: true, result });
  } catch (err: any) {
    return c.json({ ok: false, error: err.message }, 500);
  }
});

// Debug: check pending research jobs
app.get("/api/debug/jobs", async (c) => {
  try {
    const { getDb } = await import("./queries/connection");
    const { researchJobs } = await import("@db/schema");
    const { eq, desc } = await import("drizzle-orm");
    const db = getDb();
    const pending = await db.select().from(researchJobs).where(eq(researchJobs.status, "pending")).orderBy(desc(researchJobs.createdAt)).limit(10);
    const running = await db.select().from(researchJobs).where(eq(researchJobs.status, "running")).orderBy(desc(researchJobs.createdAt)).limit(10);
    const completed = await db.select().from(researchJobs).where(eq(researchJobs.status, "completed")).orderBy(desc(researchJobs.createdAt)).limit(5);
    const failed = await db.select().from(researchJobs).where(eq(researchJobs.status, "failed")).orderBy(desc(researchJobs.createdAt)).limit(5);
    return c.json({ ok: true, pending: pending.length, running: running.length, completed: completed.length, failed: failed.length, latestPending: pending, latestFailed: failed });
  } catch (err: any) {
    return c.json({ ok: false, error: err.message }, 500);
  }
});

// ── PUBLIC CRON ENDPOINTS (called by cron-jobs.org) ──
// These bypass Vercel's 8s HTTP timeout because cron-jobs.org calls them
// from outside Vercel's gateway, and vercel.json sets maxDuration: 300s.
app.route("/api/cron", cronRouter);

// ── tRPC handler ──
app.use("/api/trpc/*", async (c) => {
  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req: c.req.raw,
    router: appRouter,
    createContext,
  });
});

app.all("/api/*", (c) => c.json({ error: "Not Found" }, 404));

export default app;

if (env.isProduction && !process.env.VERCEL) {
  const { serve } = await import("@hono/node-server");
  const { serveStaticFiles } = await import("./lib/vite");
  serveStaticFiles(app);

  const port = parseInt(process.env.PORT || "3000");
  serve({ fetch: app.fetch, port }, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}
