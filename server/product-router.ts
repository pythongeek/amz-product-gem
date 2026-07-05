import { z } from "zod";
import { createRouter, authedQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { products, folders } from "@db/schema";
import { eq, and, desc } from "drizzle-orm";

export const productRouter = createRouter({
  list: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    return db
      .select()
      .from(products)
      .where(eq(products.userId, ctx.user.id))
      .orderBy(desc(products.createdAt));
  }),

  getById: authedQuery
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = getDb();
      const result = await db
        .select()
        .from(products)
        .where(and(eq(products.id, input.id), eq(products.userId, ctx.user.id)))
        .limit(1);
      return result[0] || null;
    }),

  create: authedQuery
    .input(
      z.object({
        asin: z.string(),
        title: z.string().optional(),
        price: z.string().optional(),
        priceRange: z.string().optional(),
        rating: z.string().optional(),
        reviewCount: z.number().optional(),
        amazonChoice: z.boolean().optional(),
        amazonChoiceReason: z.string().optional(),
        bsr: z.number().optional(),
        bsrCategory: z.string().optional(),
        imageUrl: z.string().optional(),
        sellerCount: z.number().optional(),
        fbaSellers: z.number().optional(),
        fbmSellers: z.number().optional(),
        variationCount: z.number().optional(),
        qaCount: z.number().optional(),
        hasAplusContent: z.boolean().optional(),
        hasVideo: z.boolean().optional(),
        launchDate: z.string().optional(),
        reviewVelocity: z.string().optional(),
        salesEstimate: z.number().optional(),
        marketplace: z.string().optional(),
        tags: z.array(z.string()).optional(),
        notes: z.string().optional(),
        folderId: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const insertData: any = {
        asin: input.asin,
        userId: ctx.user.id,
        title: input.title,
        price: input.price ? parseFloat(input.price) : null,
        priceRange: input.priceRange,
        rating: input.rating ? parseFloat(input.rating) : null,
        reviewCount: input.reviewCount,
        amazonChoice: input.amazonChoice,
        amazonChoiceReason: input.amazonChoiceReason,
        bsr: input.bsr,
        bsrCategory: input.bsrCategory,
        imageUrl: input.imageUrl,
        sellerCount: input.sellerCount,
        fbaSellers: input.fbaSellers,
        fbmSellers: input.fbmSellers,
        variationCount: input.variationCount,
        qaCount: input.qaCount,
        hasAplusContent: input.hasAplusContent,
        hasVideo: input.hasVideo,
        reviewVelocity: input.reviewVelocity ? parseFloat(input.reviewVelocity) : null,
        salesEstimate: input.salesEstimate,
        marketplace: input.marketplace,
        tags: input.tags,
        notes: input.notes,
        folderId: input.folderId,
        launchDate: input.launchDate ? new Date(input.launchDate) : null,
      };
      const result = await db.insert(products).values(insertData).returning();
      return result[0];
    }),

  update: authedQuery
    .input(
      z.object({
        id: z.number(),
        data: z.object({
          title: z.string().optional(),
          status: z.enum(["researching", "hot_opportunity", "sourced", "launched", "archived"]).optional(),
          tags: z.array(z.string()).optional(),
          notes: z.string().optional(),
          folderId: z.number().optional(),
          price: z.string().optional(),
          bsr: z.number().optional(),
          reviewCount: z.number().optional(),
        }),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const updateData: any = {
        ...input.data,
        price: input.data.price ? parseFloat(input.data.price) : null,
        updatedAt: new Date(),
      };
      if (input.data.folderId === undefined) delete updateData.folderId;
      const result = await db
        .update(products)
        .set(updateData)
        .where(and(eq(products.id, input.id), eq(products.userId, ctx.user.id)))
        .returning();
      return result[0];
    }),

  delete: authedQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      await db
        .delete(products)
        .where(and(eq(products.id, input.id), eq(products.userId, ctx.user.id)));
      return { success: true };
    }),

  listFolders: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    return db
      .select()
      .from(folders)
      .where(eq(folders.userId, ctx.user.id))
      .orderBy(desc(folders.createdAt));
  }),

  createFolder: authedQuery
    .input(
      z.object({
        name: z.string(),
        description: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const result = await db
        .insert(folders)
        .values({ ...input, userId: ctx.user.id })
        .returning();
      return result[0];
    }),
});
