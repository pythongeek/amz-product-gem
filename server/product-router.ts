import { z } from "zod";
import { createRouter, authedQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { products, folders, productScores, productSnapshots } from "@db/schema";
import { eq, and, desc } from "drizzle-orm";
import { scoreProduct } from "./lib/scoring";
import { fetchAmazonProduct } from "./lib/amazon-paapi";

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

  bulkImport: authedQuery
    .input(z.object({ csvContent: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      
      // Helper function for basic CSV parsing
      const parseCSV = (csvText: string) => {
        const lines = csvText.split(/\r?\n/).filter(line => line.trim().length > 0);
        if (lines.length === 0) return [];
        const headers = lines[0].split(",").map(h => h.trim().replace(/^["']|["']$/g, "").toLowerCase());
        const results: Record<string, string>[] = [];
        
        for (let i = 1; i < lines.length; i++) {
          const currentLine = lines[i];
          const values: string[] = [];
          let insideQuote = false;
          let currentVal = "";
          for (let j = 0; j < currentLine.length; j++) {
            const char = currentLine[j];
            if (char === '"') {
              insideQuote = !insideQuote;
            } else if (char === ',' && !insideQuote) {
              values.push(currentVal.trim().replace(/^["']|["']$/g, ""));
              currentVal = "";
            } else {
              currentVal += char;
            }
          }
          values.push(currentVal.trim().replace(/^["']|["']$/g, ""));
          
          const row: Record<string, string> = {};
          headers.forEach((header, index) => {
            row[header] = values[index] || "";
          });
          results.push(row);
        }
        return results;
      };

      const rows = parseCSV(input.csvContent);
      let importedCount = 0;

      for (const row of rows) {
        const asin = row.asin || "";
        if (!asin) continue;
        const price = parseFloat(row.price || "0") || 29.99;
        const bsr = parseInt(row.bsr || "0") || 15000;
        const reviewCount = parseInt(row.reviews || row.review_count || "0") || 100;
        const title = row.title || `Imported Product ${asin}`;
        const marketplace = (row.marketplace || "US").toUpperCase();
        const category = row.category || "most_categories";
        const weight = parseFloat(row.weight || "1.0") || 1.0;
        const rating = parseFloat(row.rating || "4.2") || 4.2;
        const sellerCount = parseInt(row.sellercount || row.seller_count || "5") || 5;

        // Create product
        const [product] = await db
          .insert(products)
          .values({
            userId: ctx.user.id,
            asin,
            title,
            price: String(price),
            bsr,
            reviewCount,
            rating: String(rating),
            sellerCount,
            marketplace,
            status: "researching",
          })
          .returning();

        // Recalculate 13-point score
        const { scores, totalScore, grade, recommendation } = await scoreProduct({
          price,
          weight,
          bsr,
          reviewCount,
          sellerCount,
          category,
          marketplace,
          hasBattery: false,
          isElectronic: false,
          isFragile: false,
        });

        // Save scores
        await db.insert(productScores).values({
          productId: product.id,
          userId: ctx.user.id,
          priceScore: scores.priceScore,
          sizeWeightScore: scores.sizeWeightScore,
          marketSizeScore: scores.marketSizeScore,
          reviewBarrierScore: scores.reviewBarrierScore,
          differentiationScore: scores.differentiationScore,
          seasonalityScore: scores.seasonalityScore,
          complexityScore: scores.complexityScore,
          returnRateScore: scores.returnRateScore,
          brandDominanceScore: scores.brandDominanceScore,
          trendScore: scores.trendScore,
          defensibilityScore: scores.defensibilityScore,
          manufacturabilityScore: scores.manufacturabilityScore,
          marginScore: scores.marginScore,
          totalScore,
          grade,
          recommendation,
          analysisData: {
            price,
            weight,
            bsr,
            reviewCount,
            sellerCount,
            category,
            calculatedAt: new Date().toISOString(),
          },
        });

        // Insert initial snapshot
        await db.insert(productSnapshots).values({
          productId: product.id,
          price: String(price),
          bsr,
          reviewCount,
        });

        importedCount++;
      }

      return { success: true, count: importedCount };
    }),

  refresh: authedQuery
    .input(z.object({ productId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const productRows = await db
        .select()
        .from(products)
        .where(and(eq(products.id, input.productId), eq(products.userId, ctx.user.id)))
        .limit(1);

      const product = productRows[0];
      if (!product) {
        throw new Error("Product not found");
      }

      // Fetch from PA-API
      const data = await fetchAmazonProduct(product.asin, product.marketplace || "US");

      // Update product fields
      const updated = await db
        .update(products)
        .set({
          title: data.title,
          price: String(data.price),
          rating: String(data.rating),
          reviewCount: data.reviewCount,
          updatedAt: new Date(),
        })
        .where(eq(products.id, product.id))
        .returning();

      // Recalculate score
      const { scores, totalScore, grade, recommendation } = await scoreProduct({
        price: data.price,
        weight: 1.0,
        bsr: product.bsr || 15000,
        reviewCount: data.reviewCount,
        sellerCount: product.sellerCount || 5,
        marketplace: product.marketplace || "US",
        hasBattery: false,
        isElectronic: false,
        isFragile: false,
      });

      // Update or insert score
      const existingScores = await db
        .select()
        .from(productScores)
        .where(eq(productScores.productId, product.id))
        .limit(1);

      if (existingScores.length > 0) {
        await db
          .update(productScores)
          .set({
            priceScore: scores.priceScore,
            sizeWeightScore: scores.sizeWeightScore,
            marketSizeScore: scores.marketSizeScore,
            reviewBarrierScore: scores.reviewBarrierScore,
            differentiationScore: scores.differentiationScore,
            seasonalityScore: scores.seasonalityScore,
            complexityScore: scores.complexityScore,
            returnRateScore: scores.returnRateScore,
            brandDominanceScore: scores.brandDominanceScore,
            trendScore: scores.trendScore,
            defensibilityScore: scores.defensibilityScore,
            manufacturabilityScore: scores.manufacturabilityScore,
            marginScore: scores.marginScore,
            totalScore,
            grade,
            recommendation,
            updatedAt: new Date(),
          })
          .where(eq(productScores.productId, product.id));
      } else {
        await db.insert(productScores).values({
          productId: product.id,
          userId: ctx.user.id,
          priceScore: scores.priceScore,
          sizeWeightScore: scores.sizeWeightScore,
          marketSizeScore: scores.marketSizeScore,
          reviewBarrierScore: scores.reviewBarrierScore,
          differentiationScore: scores.differentiationScore,
          seasonalityScore: scores.seasonalityScore,
          complexityScore: scores.complexityScore,
          returnRateScore: scores.returnRateScore,
          brandDominanceScore: scores.brandDominanceScore,
          trendScore: scores.trendScore,
          defensibilityScore: scores.defensibilityScore,
          manufacturabilityScore: scores.manufacturabilityScore,
          marginScore: scores.marginScore,
          totalScore,
          grade,
          recommendation,
        });
      }

      // Create snapshot for alert check
      await db.insert(productSnapshots).values({
        productId: product.id,
        price: String(data.price),
        bsr: product.bsr,
        reviewCount: data.reviewCount,
      });

      return updated[0];
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
