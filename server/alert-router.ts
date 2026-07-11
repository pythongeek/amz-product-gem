import { z } from "zod";
import { createRouter, authedQuery, publicQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { alerts, products, activities, cronState, productSnapshots } from "@db/schema";
import { eq, desc, sql } from "drizzle-orm";

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

        const currentPrice = product.price ? parseFloat(String(product.price)) : null;
        const currentBsr = product.bsr;
        const currentReviewCount = product.reviewCount;

        // Fetch latest snapshot
        const latestSnapshots = await db
          .select()
          .from(productSnapshots)
          .where(eq(productSnapshots.productId, product.id))
          .orderBy(desc(productSnapshots.capturedAt))
          .limit(1);

        const latestSnapshot = latestSnapshots[0];

        // Insert new snapshot
        await db.insert(productSnapshots).values({
          productId: product.id,
          price: product.price,
          bsr: product.bsr,
          reviewCount: product.reviewCount,
        });

        if (latestSnapshot) {
          const oldPrice = latestSnapshot.price ? parseFloat(String(latestSnapshot.price)) : null;
          const oldBsr = latestSnapshot.bsr;
          const oldReviewCount = latestSnapshot.reviewCount;

          // Price drop check (>2% drop)
          if (currentPrice !== null && oldPrice !== null && oldPrice > currentPrice) {
            const priceDiffPct = ((oldPrice - currentPrice) / oldPrice) * 100;
            if (priceDiffPct > 2) {
              const message = getAlertMessage("price_drop", product.title || "Unknown");
              const alert = await db.insert(alerts).values({
                productId: product.id,
                userId: product.userId,
                alertType: "price_drop",
                oldValue: String(oldPrice),
                newValue: String(currentPrice),
                message,
              }).returning();

              await db.insert(activities).values({
                userId: product.userId,
                action: "alert_triggered",
                entityType: "alert",
                entityId: alert[0].id,
                details: { productAsin: product.asin, alertType: "price_drop" },
              });
              newAlertsCount++;
            }
          }

          // BSR change check (>20% absolute delta)
          if (currentBsr !== null && oldBsr !== null && oldBsr > 0) {
            const bsrDiffPct = Math.abs((currentBsr - oldBsr) / oldBsr) * 100;
            if (bsrDiffPct > 20) {
              const message = getAlertMessage("bsr_change", product.title || "Unknown");
              const alert = await db.insert(alerts).values({
                productId: product.id,
                userId: product.userId,
                alertType: "bsr_change",
                oldValue: String(oldBsr),
                newValue: String(currentBsr),
                message,
              }).returning();

              await db.insert(activities).values({
                userId: product.userId,
                action: "alert_triggered",
                entityType: "alert",
                entityId: alert[0].id,
                details: { productAsin: product.asin, alertType: "bsr_change" },
              });
              newAlertsCount++;
            }
          }

          // Review count check (>0 positive delta)
          if (currentReviewCount !== null && oldReviewCount !== null && currentReviewCount > oldReviewCount) {
            const message = getAlertMessage("new_review", product.title || "Unknown");
            const alert = await db.insert(alerts).values({
              productId: product.id,
              userId: product.userId,
              alertType: "new_review",
              oldValue: String(oldReviewCount),
              newValue: String(currentReviewCount),
              message,
            }).returning();

            await db.insert(activities).values({
              userId: product.userId,
              action: "alert_triggered",
              entityType: "alert",
              entityId: alert[0].id,
              details: { productAsin: product.asin, alertType: "new_review" },
            });
            newAlertsCount++;
          }
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
