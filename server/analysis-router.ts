import { z } from "zod";
import { createRouter, authedQuery } from "./middleware";
import {
  callAIWithFallback,
  buildGroundedSystemPrompt,
  BANGLA_SYSTEM_PROMPT,
} from "./lib/ai";
import { getDb } from "./queries/connection";
import { productScores, researchJobs, products, reports } from "@db/schema";
import { scoreProduct, extractSpecsFromReport } from "./lib/scoring";
import { eq, desc } from "drizzle-orm";

export const analysisRouter = createRouter({
  // ── Analyze Product (queue-based to bypass 8s timeout) ──
  analyzeProduct: authedQuery
    .input(
      z.object({
        title: z.string().min(1),
        asin: z.string().optional(),
        marketplace: z
          .enum(["US", "UK", "DE", "CA", "FR", "IT", "ES", "JP"])
          .default("US"),
        productUrl: z.string().optional(),
        isManual: z.literal(false).default(false),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = getDb();

      const jobInput = input.productUrl || input.title.trim();
      const jobType = input.productUrl ? "url" : "keyword";

      if (input.productUrl) {
        let parsed: URL;
        try {
          parsed = new URL(input.productUrl);
        } catch {
          throw new Error("A valid Amazon product URL is required.");
        }
        if (
          !/^([a-z0-9-]+\.)?amazon\.[a-z.]+$/i.test(parsed.hostname) ||
          !/(?:\/dp\/|\/gp\/product\/)[A-Z0-9]{10}/i.test(parsed.pathname)
        ) {
          throw new Error(
            "Enter an Amazon product URL containing a valid ASIN."
          );
        }
      }

      // Queue the job instead of doing it inline
      const [job] = await db
        .insert(researchJobs)
        .values({
          userId: ctx.user.id,
          input: jobInput,
          inputType: jobType,
          marketplace: input.marketplace,
          status: "pending",
        })
        .returning();

      return {
        jobId: job.id,
        message: "Analysis queued. Check status with job.getJobStatus",
      };
    }),

  // ── Legacy: Validate Product ──
  validateProduct: authedQuery
    .input(
      z.object({
        productId: z.number(),
        productData: z.object({
          price: z.number(),
          weight: z.number().optional(),
          dimensions: z.string().optional(),
          reviewCount: z.number(),
          bsr: z.number(),
          sellerCount: z.number(),
          category: z.string().optional(),
          hasBattery: z.boolean().optional(),
          isElectronic: z.boolean().optional(),
          isFragile: z.boolean().optional(),
        }),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { productData } = input;
      const db = getDb();

      // Retrieve product to get its marketplace
      const productRows = await db
        .select()
        .from(products)
        .where(eq(products.id, input.productId))
        .limit(1);
      const product = productRows[0];
      const marketplace = product?.marketplace || "US";

      const { scores, totalScore, grade, recommendation } = await scoreProduct({
        price: productData.price,
        weight: productData.weight,
        bsr: productData.bsr,
        reviewCount: productData.reviewCount,
        sellerCount: productData.sellerCount,
        category: productData.category,
        hasBattery: productData.hasBattery,
        isElectronic: productData.isElectronic,
        isFragile: productData.isFragile,
        marketplace,
      });
      await db.insert(productScores).values({
        productId: input.productId,
        userId: ctx.user.id,
        ...scores,
        totalScore,
        grade,
        recommendation,
        analysisData: {
          ...productData,
          calculatedAt: new Date().toISOString(),
        },
      });

      return {
        ...scores,
        totalScore,
        grade,
        recommendation,
        maxScore: 130,
      };
    }),

  // ── Generate Report ──
  generateReport: authedQuery
    .input(
      z.object({
        title: z.string(),
        asin: z.string(),
        marketplace: z.string().default("US"),
        analysis: z.string(),
        scores: z.object({
          totalScore: z.number(),
          grade: z.string(),
          recommendation: z.string(),
        }),
      })
    )
    .mutation(async ({ input }) => {
      const reportPrompt = `"${input.title}" (ASIN: ${input.asin}) প্রোডাক্টের জন্য একটি সম্পূর্ণ বাংলা রিসার্চ রিপোর্ট তৈরি করুন।

বিশ্লেষণ তথ্য:
${input.analysis}

স্কোর: ${input.scores.totalScore}/130 — গ্রেড: ${input.scores.grade}

রিপোর্ট এই সেকশনগুলোতে লিখুন:
# প্রোডাক্ট সারাংশ
# মার্কেট চাহিদা বিশ্লেষণ (ডিমান্ড)
# প্রতিযোগিতা বিশ্লেষণ (কম্পিটিশন)
# লাভের সম্ভাবনা (প্রফিট)
# ঝুঁকি বিষয় (রিস্ক)
# 13-পয়েন্ট চেকলিস্ট রেজাল্ট
# চূড়ান্ত সুপারিশ
# পরবর্তী ধাপ (নেক্সট স্টেপ)

ব্যবসায়িক টার্মগুলোর বাংলা অনুবাদ বন্ধনীতে দিন। টেবিল ও বুলেট পয়েন্ট ব্যবহার করুন।`;

      const systemPrompt = await buildGroundedSystemPrompt(input.marketplace);
      const report = await callAIWithFallback([
        { role: "system", content: systemPrompt },
        { role: "user", content: reportPrompt },
      ]);

      return { report };
    }),

  // ── Get Trends (real AI analysis) ──
  getTrends: authedQuery
    .input(z.object({ keyword: z.string() }))
    .query(async ({ input }) => {
      const prompt = `"${input.keyword}" কীওয়ার্ডটি Amazon-এর ট্রেন্ড বিশ্লেষণ করুন। বাংলায় এই ফরম্যাটে দিন:
১. ট্রেন্ড ডিরেকশন (রাইজিং/ফলিং/স্টেবল)
২. সিজনালিটি (কোন মাসে বেশি চাহিদা)
৩. পিক মাসগুলো
৪. রিলেটেড কীওয়ার্ড (৫টি)
৫. টপ রিজিয়ন (US স্টেট অনুযায়ী)

JSON ফরম্যাটে দিন যাতে পার্স করা যায়।`;

      const trendsText = await callAIWithFallback(
        [
          { role: "system", content: BANGLA_SYSTEM_PROMPT },
          { role: "user", content: prompt },
        ],
        0.5,
        2000
      );

      return {
        keyword: input.keyword,
        aiAnalysis: trendsText,
      };
    }),

  getReportByProduct: authedQuery
    .input(z.object({ productId: z.number() }))
    .query(async ({ input }) => {
      const db = getDb();
      const rows = await db
        .select()
        .from(reports)
        .where(eq(reports.productId, input.productId))
        .orderBy(desc(reports.createdAt))
        .limit(1);
      return rows[0] || null;
    }),

  createReport: authedQuery
    .input(z.object({ productId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const productRows = await db
        .select()
        .from(products)
        .where(eq(products.id, input.productId))
        .limit(1);
      const product = productRows[0];
      if (!product) throw new Error("Product not found");

      // Fetch scores
      const scoreRows = await db
        .select()
        .from(productScores)
        .where(eq(productScores.productId, product.id))
        .limit(1);
      const productScore = scoreRows[0];

      // Build AI prompt
      const prompt = `"${product.title}" (ASIN: ${product.asin}) প্রোডাক্টের জন্য একটি সম্পূর্ণ বাংলা রিসার্চ রিপোর্ট তৈরি করুন।

মেট্রিকস:
- প্রাইজ: $${product.price}
- BSR: ${product.bsr ? `#${product.bsr.toLocaleString()}` : "N/A"}
- রেটিং: ${product.rating}
- রিভিউ: ${product.reviewCount}
- সেলার সংখ্যা: ${product.sellerCount || "N/A"}
- FBA সেলার: ${product.fbaSellers || "N/A"}
- ক্যাটাগরি: ${product.bsrCategory || "Home & Kitchen"}
- A+ কন্টেন্ট: ${product.hasAplusContent ? "আছে" : "নেই"}
- ভিডিও: ${product.hasVideo ? "আছে" : "নেই"}

${productScore ? `স্কোর: ${productScore.totalScore}/130 — গ্রেড: ${productScore.grade} — সুপারিশ: ${productScore.recommendation}` : ""}

রিপোর্ট এই সেকশনগুলোতে লিখুন:
# প্রোডাক্ট সারাংশ
# মার্কেট চাহিদা বিশ্লেষণ (ডিমান্ড)
# প্রতিযোগিতা বিশ্লেষণ (কম্পিটিশন)
# লাভের সম্ভাবনা (প্রফিট)
# ঝুঁকি বিষয় (রিস্ক)
# 13-পয়েন্ট চেকলিস্ট রেজাল্ট
# চূড়ান্ত সুপারিশ
# পরবর্তী ধাপ (নেক্সট স্টেপ)

ব্যবসায়িক টার্মগুলোর বাংলা অনুবাদ বন্ধনীতে দিন। টেবিল ও বুলেট পয়েন্ট ব্যবহার করুন।`;

      const systemPrompt = await buildGroundedSystemPrompt(
        product.marketplace || "US"
      );
      const reportContent = await callAIWithFallback([
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt },
      ]);

      const [newReport] = await db
        .insert(reports)
        .values({
          productId: product.id,
          userId: ctx.user.id,
          title: product.title,
          content: reportContent,
          summary: reportContent.substring(0, 500) + "...",
          marketAnalysis: reportContent,
          competitionAnalysis: reportContent,
          profitAnalysis: reportContent,
          riskAnalysis: reportContent,
          recommendation: productScore?.recommendation || "রিসার্চ রিপোর্ট",
          language: "bn",
        })
        .returning();

      // Update product with specs parsed from the report
      const parsedSpecs = extractSpecsFromReport(reportContent);
      await db
        .update(products)
        .set({
          price: product.price
            ? product.price
            : parsedSpecs.price
              ? String(parsedSpecs.price)
              : null,
          bsr: product.bsr ? product.bsr : parsedSpecs.bsr || null,
          reviewCount: product.reviewCount
            ? product.reviewCount
            : parsedSpecs.reviewCount || null,
          rating: product.rating
            ? product.rating
            : parsedSpecs.rating
              ? String(parsedSpecs.rating)
              : null,
          sellerCount: product.sellerCount
            ? product.sellerCount
            : parsedSpecs.sellerCount || null,
          salesEstimate: product.salesEstimate
            ? product.salesEstimate
            : parsedSpecs.salesEstimate || null,
          bsrCategory: product.bsrCategory
            ? product.bsrCategory
            : parsedSpecs.category || null,
        })
        .where(eq(products.id, product.id));

      return newReport;
    }),
});
