import { z } from "zod";
import { createRouter, authedQuery, publicQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { alerts, products, activities } from "@db/schema";
import { eq, desc } from "drizzle-orm";

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
      const allProducts = await db.select().from(products);

      const newAlerts = [];

      for (const product of allProducts) {
        const mockChanges = Math.random() > 0.7;

        if (mockChanges) {
          const alertType = ["price_drop", "bsr_change", "new_review"][
            Math.floor(Math.random() * 3)
          ];

          const alert = await db
            .insert(alerts)
            .values({
              productId: product.id,
              userId: product.userId,
              alertType: alertType as "price_drop" | "bsr_change" | "new_review",
              oldValue: String(Math.floor(Math.random() * 100)),
              newValue: String(Math.floor(Math.random() * 100)),
              message: getAlertMessage(alertType, product.title || "Unknown"),
            })
            .returning();

          newAlerts.push(alert[0]);

          await db.insert(activities).values({
            userId: product.userId,
            action: "alert_triggered",
            entityType: "alert",
            entityId: alert[0].id,
            details: { productAsin: product.asin, alertType },
          });
        }
      }

      return {
        checked: allProducts.length,
        newAlerts: newAlerts.length,
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
