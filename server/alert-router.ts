import { z } from "zod";
import { createRouter, authedQuery, publicQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { alerts, products, activities, cronState } from "@db/schema";
import { eq, desc, sql } from "drizzle-orm";

const BATCH_SIZE = 10; // Process 10 products per cron run

export const alertRouter = createRouter({
  list: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    return db
      .select()
      .from(alerts)
      .where(eq(alerts.userId, ctx.user.id))
      .orderBy(desc(alerts.createdAt));
  }),

  markRead: authedQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db
        .update(alerts)
        .set({ isRead: true })
        .where(eq(alerts.id, input.id));
      return { success: true };
    }),

  markAllRead: authedQuery.mutation(async ({ ctx }) => {
    const db = getDb();
    await db
      .update(alerts)
      .set({ isRead: true })
      .where(eq(alerts.userId, ctx.user.id));
    return { success: true };
  }),

  checkChanges: publicQuery
    .input(
      z.object({
        cronSecret: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      if (input.cronSecret !== process.env.CRON_SECRET) {
        throw new Error("Invalid cron secret");
      }

      const db = getDb();
      const batchSize = parseInt(process.env.CRON_BATCH_SIZE || "10");

      // Get current cursor from cron_state table
      const cursorResult = await db
        .select()
        .from(cronState)
        .where(eq(cronState.key, "product_analysis_cursor"))
        .limit(1);

      const cursor = cursorResult[0]?.value || "0";
      let processedCount = 0;
      let newAlertsCount = 0;

      // Process products in batches
      const productsToProcess = await db
        .select()
        .from(products)
        .orderBy(sql`id ASC`)
        .limit(batchSize)
        .offset(parseInt(cursor));

      for (const product of productsToProcess) {
        processedCount++;

        // Use AI to detect actual changes (mock data for now)
        // In production, this would compare historical data and use AI for analysis
        const mockChanges = Math.random() > 0.7;

        if (mockChanges) {
          const alertType = (() => {
        const types: Array<"price_drop" | "bsr_change" | "new_review"> = [
          "price_drop",
          "bsr_change",
          "new_review",
        ];
        return types[Math.floor(Math.random() * 3)];
      })();

          const alert = await db
            .insert(alerts)
            .values({
              productId: product.id,
              userId: product.userId,
              alertType,
              oldValue: String(Math.floor(Math.random() * 100)),
              newValue: String(Math.floor(Math.random() * 100)),
              message: getAlertMessage(alertType, product.title || "Unknown"),
            })
            .returning();

          newAlertsCount++;

          await db.insert(activities).values({
            userId: product.userId,
            action: "alert_triggered",
            entityType: "alert",
            entityId: alert[0].id,
            details: { productAsin: product.asin, alertType },
          });
        }
      }

      // Update cursor to next position
      const nextCursor = (parseInt(cursor) + processedCount).toString();
      await db
        .update(cronState)
        .set({ value: nextCursor, updatedAt: new Date() })
        .where(eq(cronState.key, "product_analysis_cursor"));

      // Check if we've processed all products
      const totalProducts = await db.select({ count: sql<number>`count(*)::int` }).from(products);
      const totalCount = totalProducts[0].count;
      const nextCursorNum = parseInt(nextCursor);
      const allProcessed = nextCursorNum >= totalCount;

      return {
        checked: processedCount,
        totalChecked: productsToProcess.length,
        newAlerts: newAlertsCount,
        allProcessed,
        nextCursor,
        message: allProcessed
          ? "All products processed"
          : `Processed ${processedCount} products. ${totalCount - nextCursorNum} products remaining.`,
      };
    }),
});

function getAlertMessage(type: string, productTitle: string): string {
  switch (type) {
    case "price_drop":
      return `"${productTitle.substring(0, 50)}..."-এর প্রাইস কমেছে`;
    case "bsr_change":
      return `"${productTitle.substring(0, 50)}..."-এর BSR পরিবর্তন হয়েছে`;
    case "new_review":
      return `"${productTitle.substring(0, 50)}..."-এ নতুন রিভিউ এসেছে`;
    default:
      return `"${productTitle.substring(0, 50)}..."-এ পরিবর্তন শনাক্ত`;
  }
}
