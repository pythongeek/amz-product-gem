import { z } from "zod";
import { createRouter, authedQuery } from "./middleware";
import { getDb } from "./queries/connection";
import {
  products,
  folders,
  productScores,
  productSnapshots,
  reports,
  fbaCalculations,
  alerts,
  launchStrategies,
} from "@db/schema";
import { eq, and, desc } from "drizzle-orm";
import { fetchAmazonProduct } from "./lib/amazon-paapi";

const marketplaces = ["US", "UK", "DE", "CA", "FR", "IT", "ES", "JP"] as const;

function getAsinFromAmazonUrl(rawUrl: string): string {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error("A valid Amazon product URL is required.");
  }
  if (!/^([a-z0-9-]+\.)?amazon\.[a-z.]+$/i.test(url.hostname))
    throw new Error("Only Amazon product URLs are supported.");
  const match = url.pathname.match(
    /\/(?:dp|gp\/product)\/([A-Z0-9]{10})(?:[/?]|$)/i
  );
  if (!match)
    throw new Error("The Amazon URL must include a valid 10-character ASIN.");
  return match[1].toUpperCase();
}

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
    .input(z.object({ asin: z.string() }))
    .mutation(async () => {
      throw new Error(
        "Manual product creation is disabled. Add a verified Amazon product URL instead."
      );
    }),

  update: authedQuery
    .input(
      z.object({
        id: z.number(),
        data: z.object({
          title: z.string().optional(),
          status: z
            .enum([
              "researching",
              "hot_opportunity",
              "sourced",
              "launched",
              "archived",
            ])
            .optional(),
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

      // Manually delete child records first to prevent foreign key violations
      await db
        .delete(productScores)
        .where(eq(productScores.productId, input.id));
      await db
        .delete(productSnapshots)
        .where(eq(productSnapshots.productId, input.id));
      await db.delete(reports).where(eq(reports.productId, input.id));
      await db
        .delete(fbaCalculations)
        .where(eq(fbaCalculations.productId, input.id));
      await db.delete(alerts).where(eq(alerts.productId, input.id));
      await db
        .delete(launchStrategies)
        .where(eq(launchStrategies.productId, input.id));

      await db
        .delete(products)
        .where(
          and(eq(products.id, input.id), eq(products.userId, ctx.user.id))
        );
      return { success: true };
    }),

  bulkImport: authedQuery
    .input(z.object({ csvContent: z.string() }))
    .mutation(async () => {
      throw new Error(
        "CSV import is disabled because it cannot verify live Amazon data. Add products with Amazon URLs instead."
      );
    }),

  refresh: authedQuery
    .input(z.object({ productId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const [product] = await db
        .select()
        .from(products)
        .where(
          and(
            eq(products.id, input.productId),
            eq(products.userId, ctx.user.id)
          )
        )
        .limit(1);
      if (!product) throw new Error("Product not found");

      const data = await fetchAmazonProduct(
        product.asin,
        product.marketplace || "US"
      );
      if (!data.title || data.price <= 0) {
        throw new Error(
          "Amazon did not return enough verified data to refresh this product."
        );
      }

      const [updated] = await db
        .update(products)
        .set({
          title: data.title,
          price: String(data.price),
          rating: data.rating ? String(data.rating) : null,
          reviewCount: data.reviewCount || null,
          imageUrl: data.imageUrl || null,
          bsr: data.bsr ?? null,
          bsrCategory: data.bsrCategory ?? null,
          amazonChoice: data.amazonChoice ?? null,
          sellerCount: data.sellerCount ?? null,
          fbaSellers: data.fbaSellers ?? null,
          fbmSellers: data.fbmSellers ?? null,
          variationCount: data.variationCount ?? null,
          qaCount: data.qaCount ?? null,
          hasAplusContent: data.hasAplusContent ?? null,
          hasVideo: data.hasVideo ?? null,
          reviewVelocity: data.reviewVelocity
            ? String(data.reviewVelocity)
            : null,
          salesEstimate: data.salesEstimate ?? null,
          updatedAt: new Date(),
        })
        .where(eq(products.id, product.id))
        .returning();

      await db.insert(productSnapshots).values({
        productId: product.id,
        price: String(data.price),
        bsr: data.bsr ?? null,
        reviewCount: data.reviewCount || null,
      });
      return updated;
    }),

  quickSaveUrl: authedQuery
    .input(
      z.object({
        url: z.string().url(),
        marketplace: z.enum(marketplaces).default("US"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const asin = getAsinFromAmazonUrl(input.url);
      const data = await fetchAmazonProduct(asin, input.marketplace);
      if (!data.title || data.price <= 0) {
        throw new Error(
          "Amazon did not return enough verified data for this product."
        );
      }

      const values = {
        title: data.title,
        price: String(data.price),
        rating: data.rating ? String(data.rating) : null,
        reviewCount: data.reviewCount || null,
        bsr: data.bsr ?? null,
        bsrCategory: data.bsrCategory ?? null,
        imageUrl: data.imageUrl || null,
        amazonChoice: data.amazonChoice ?? null,
        sellerCount: data.sellerCount ?? null,
        fbaSellers: data.fbaSellers ?? null,
        fbmSellers: data.fbmSellers ?? null,
        variationCount: data.variationCount ?? null,
        qaCount: data.qaCount ?? null,
        hasAplusContent: data.hasAplusContent ?? null,
        hasVideo: data.hasVideo ?? null,
        reviewVelocity: data.reviewVelocity
          ? String(data.reviewVelocity)
          : null,
        salesEstimate: data.salesEstimate ?? null,
        marketplace: input.marketplace,
        updatedAt: new Date(),
      };

      const [existing] = await db
        .select()
        .from(products)
        .where(
          and(
            eq(products.userId, ctx.user.id),
            eq(products.asin, asin),
            eq(products.marketplace, input.marketplace)
          )
        )
        .limit(1);

      const [product] = existing
        ? await db
            .update(products)
            .set(values)
            .where(eq(products.id, existing.id))
            .returning()
        : await db
            .insert(products)
            .values({
              ...values,
              userId: ctx.user.id,
              asin,
              status: "researching",
            })
            .returning();

      await db.insert(productSnapshots).values({
        productId: product.id,
        price: String(data.price),
        bsr: data.bsr ?? null,
        reviewCount: data.reviewCount || null,
      });
      return { product, created: !existing };
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
