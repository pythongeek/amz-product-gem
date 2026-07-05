import { createRouter, authedQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { products, activities, alerts } from "@db/schema";
import { eq, desc, sql } from "drizzle-orm";

export const dashboardRouter = createRouter({
  getStats: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    const userId = ctx.user.id;

    const allProducts = await db
      .select()
      .from(products)
      .where(eq(products.userId, userId));

    const unreadAlerts = await db
      .select()
      .from(alerts)
      .where(eq(alerts.userId, userId));

    return {
      totalProducts: allProducts.length,
      hotOpportunities: allProducts.filter((p) => p.status === "hot_opportunity").length,
      launched: allProducts.filter((p) => p.status === "launched").length,
      researching: allProducts.filter((p) => p.status === "researching").length,
      sourced: allProducts.filter((p) => p.status === "sourced").length,
      archived: allProducts.filter((p) => p.status === "archived").length,
      unreadAlerts: unreadAlerts.filter((a) => !a.isRead).length,
      recentActivity: await db
        .select()
        .from(activities)
        .where(eq(activities.userId, userId))
        .orderBy(desc(activities.createdAt))
        .limit(10),
    };
  }),

  getRecentProducts: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    return db
      .select()
      .from(products)
      .where(eq(products.userId, ctx.user.id))
      .orderBy(desc(products.createdAt))
      .limit(10);
  }),

  getProductDistribution: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    const result = await db
      .select({
        status: products.status,
        count: sql<number>`count(*)`,
      })
      .from(products)
      .where(eq(products.userId, ctx.user.id))
      .groupBy(products.status);

    return result;
  }),
});
