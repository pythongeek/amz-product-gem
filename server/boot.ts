import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import type { HttpBindings } from "@hono/node-server";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "./router";
import { createContext } from "./context";
import { env } from "./lib/env";
import cronRouter from "./cron-router";

import { getRawPool, getDb } from "./queries/connection";
import { kbFeeRates, kbRevisions } from "@db/schema";
import { desc, sql } from "drizzle-orm";
import { verifyAdminToken } from "./lib/admin-auth";

const app = new Hono<{ Bindings: HttpBindings }>();

app.use(bodyLimit({ maxSize: 50 * 1024 * 1024 }));

// Health check
app.get("/api/health", (c) => c.json({ status: "ok", time: new Date().toISOString() }));

// Gate debug routes in production (except admin auth on kb-status)
app.use("/api/debug/*", async (c, next) => {
  if (env.isProduction) {
    if (c.req.path === "/api/debug/kb-status") {
      const authHeader = c.req.header("authorization");
      if (authHeader && authHeader.startsWith("Bearer ")) {
        const token = authHeader.substring(7);
        const payload = await verifyAdminToken(token);
        if (payload && payload.role === "admin") {
          return await next();
        }
      }
    }
    return c.json({ ok: false, error: "Forbidden in production" }, 403);
  }
  await next();
});

// KB Status Health check
app.get("/api/debug/kb-status", async (c) => {
  try {
    const db = getDb();
    
    // Calculate staleness from kbFeeRates max effective date
    const maxEffectiveDateRow = await db
      .select({ maxDate: sql<string>`max(effective_date)` })
      .from(kbFeeRates);

    const maxDateStr = maxEffectiveDateRow[0]?.maxDate;
    if (!maxDateStr) {
      return c.json({
        ok: true,
        status: "empty",
        message: "No fee data found in database. Please run seed migrations.",
      });
    }

    const maxDate = new Date(maxDateStr);
    const now = new Date();
    const diffMs = now.getTime() - maxDate.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    // Stale warning threshold: 365 days (1 year)
    const isStale = diffDays > 365;

    // Fetch last revision
    const lastRevisions = await db
      .select()
      .from(kbRevisions)
      .orderBy(desc(kbRevisions.createdAt))
      .limit(1);

    const lastRevision = lastRevisions[0] || null;

    return c.json({
      ok: true,
      status: isStale ? "stale" : "current",
      stalenessDays: diffDays,
      maxEffectiveDate: maxDateStr,
      lastRevision,
      warning: isStale 
        ? "WARNING: Fee assumptions database is older than 1 year. Please run the admin KB editor to update the 2026 fee snapshots."
        : undefined,
    });
  } catch (err: any) {
    return c.json({ ok: false, error: err.message }, 500);
  }
});

// DB diagnostic
app.get("/api/debug/db", async (c) => {
  if (env.isProduction) return c.json({ ok: false, error: "Forbidden in production" }, 403);
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
  if (env.isProduction) return c.json({ ok: false, error: "Forbidden in production" }, 403);
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
  if (env.isProduction) return c.json({ ok: false, error: "Forbidden in production" }, 403);
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
  if (env.isProduction) return c.json({ ok: false, error: "Forbidden in production" }, 403);
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

// Debug: check research jobs
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

// Debug: list all research jobs (no limit)
app.get("/api/debug/all-jobs", async (c) => {
  try {
    const { getDb } = await import("./queries/connection");
    const { researchJobs } = await import("@db/schema");
    const { desc } = await import("drizzle-orm");
    const db = getDb();
    const all = await db.select().from(researchJobs).orderBy(desc(researchJobs.createdAt)).limit(50);
    return c.json({ ok: true, count: all.length, jobs: all.map(j => ({
      id: j.id, userId: j.userId, input: j.input, status: j.status,
      createdAt: j.createdAt, error: j.error?.substring(0, 100)
    })) });
  } catch (err: any) {
    return c.json({ ok: false, error: err.message }, 500);
  }
});

// Debug: manually trigger cron job (for testing)
app.post("/api/debug/trigger-cron", async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const secret = body.cronSecret || c.req.header("x-cron-secret");
    if (secret !== env.cronSecret) {
      return c.json({ error: "Unauthorized — invalid cron secret" }, 401);
    }
    // Forward to cron router
    const req = new Request(c.req.url.replace("/debug/trigger-cron", "/cron/process-research"), {
      method: "POST",
      headers: { "x-cron-secret": env.cronSecret || "" },
    });
    const resp = await app.fetch(req);
    const result = await resp.json();
    return c.json({ ok: true, triggered: true, result });
  } catch (err: any) {
    return c.json({ ok: false, error: err.message }, 500);
  }
});

// Debug: create a test research job (for testing the full flow)
app.post("/api/debug/create-test-job", async (c) => {
  try {
    const { getDb } = await import("./queries/connection");
    const { researchJobs } = await import("@db/schema");
    const db = getDb();
    const [job] = await db.insert(researchJobs).values({
      userId: 1,
      input: "test product " + Date.now(),
      inputType: "keyword",
      marketplace: "US",
      status: "pending",
    }).returning();
    return c.json({ ok: true, jobId: job.id, message: "Test job created" });
  } catch (err: any) {
    return c.json({ ok: false, error: err.message }, 500);
  }
});

// Debug: check products table
app.get("/api/debug/products", async (c) => {
  try {
    const { getDb } = await import("./queries/connection");
    const { products } = await import("@db/schema");
    const { desc } = await import("drizzle-orm");
    const db = getDb();
    const all = await db.select().from(products).orderBy(desc(products.createdAt)).limit(20);
    return c.json({ ok: true, count: all.length, products: all.map(p => ({
      id: p.id, userId: p.userId, asin: p.asin, title: p.title,
      status: p.status, marketplace: p.marketplace, createdAt: p.createdAt
    })) });
  } catch (err: any) {
    return c.json({ ok: false, error: err.message }, 500);
  }
});

// ── PUBLIC CRON ENDPOINTS (called by cron-jobs.org) ──
app.post("/api/debug/create-test-job", async (c) => {
  try {
    const { getDb } = await import("./queries/connection");
    const { researchJobs } = await import("@db/schema");
    const db = getDb();
    const [job] = await db.insert(researchJobs).values({
      userId: 1,
      input: "test product " + Date.now(),
      inputType: "keyword",
      marketplace: "US",
      status: "pending",
    }).returning();
    return c.json({ ok: true, jobId: job.id, message: "Test job created" });
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
