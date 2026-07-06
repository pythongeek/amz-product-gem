import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import type { HttpBindings } from "@hono/node-server";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "./router";
import { createContext } from "./context";
import { env } from "./lib/env";

import { getDb } from "./queries/connection";
import { sql } from "drizzle-orm";

const app = new Hono<{ Bindings: HttpBindings }>();

app.use(bodyLimit({ maxSize: 50 * 1024 * 1024 }));

// Health check
app.get("/api/health", (c) => c.json({ status: "ok", time: new Date().toISOString() }));

// DB diagnostic — remove after fix
app.get("/api/debug/db", async (c) => {
  try {
    const db = getDb();
    const result = await db.execute(sql`SELECT current_database(), current_user, version()`);
    return c.json({ ok: true, dbInfo: result.rows[0] });
  } catch (err: any) {
    return c.json({ ok: false, error: err.message, stack: err.stack }, 500);
  }
});

// Test admin table — remove after fix
app.get("/api/debug/admin-table", async (c) => {
  try {
    const db = getDb();
    const result = await db.execute(sql`SELECT count(*) FROM admin_credentials`);
    return c.json({ ok: true, count: result.rows[0] });
  } catch (err: any) {
    return c.json({ ok: false, error: err.message, code: err.code }, 500);
  }
});

// Cron webhook endpoint for cron-jobs.org
app.post("/api/cron/monitor", async (c) => {
  const cronSecret = c.req.header("x-cron-secret");
  if (cronSecret !== process.env.CRON_SECRET) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  // Trigger monitoring check via tRPC
  const result = await appRouter.createCaller({
    req: c.req.raw,
    resHeaders: new Headers(),
  }).alert.checkChanges({ cronSecret: cronSecret || "" });

  return c.json(result);
});

// tRPC handler
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
