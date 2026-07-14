import { z } from "zod";
import { createRouter, authedQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { users } from "@db/schema";
import { eq } from "drizzle-orm";

export const authRouter = createRouter({
  me: authedQuery.query((opts) => {
    return opts.ctx.user;
  }),

  updateProfile: authedQuery
    .input(
      z.object({
        name: z.string().optional(),
        experienceLevel: z.string().optional(),
        budgetRange: z.string().optional(),
        preferredSourcing: z.string().optional(),
        targetMargin: z.number().optional(),
        localArea: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const updated = await db
        .update(users)
        .set({
          ...input,
          updatedAt: new Date(),
        })
        .where(eq(users.id, ctx.user.id))
        .returning();

      return updated[0];
    }),

  getStats: authedQuery.query(async ({ ctx }) => {
    const db = getDb();

    const userProducts = await db.query.products.findMany({
      where: (p, { eq }) => eq(p.userId, ctx.user.id),
    });

    return {
      totalProducts: userProducts.length,
      hotOpportunities: userProducts.filter((p) => p.status === "hot_opportunity").length,
      launched: userProducts.filter((p) => p.status === "launched").length,
      researching: userProducts.filter((p) => p.status === "researching").length,
    };
  }),
});
