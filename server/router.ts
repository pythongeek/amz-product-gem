import { authRouter } from "./auth-router";
import { adminAuthRouter } from "./admin-router";
import { productRouter } from "./product-router";
import { analysisRouter } from "./analysis-router";
import { fbaRouter } from "./fba-router";
import { launchRouter } from "./launch-router";
import { dashboardRouter } from "./dashboard-router";
import { alertRouter } from "./alert-router";
import { jobRouter } from "./jobRouter";
import { createRouter, publicQuery } from "./middleware";

export const appRouter = createRouter({
  ping: publicQuery.query(() => ({ ok: true, ts: Date.now() })),
  auth: authRouter,
  product: productRouter,
  analysis: analysisRouter,
  fba: fbaRouter,
  launch: launchRouter,
  dashboard: dashboardRouter,
  alert: alertRouter,
  admin: adminAuthRouter,
  job: jobRouter,
});

export type AppRouter = typeof appRouter;
