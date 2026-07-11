import { z } from "zod";
import { createRouter, authedQuery } from "./middleware";
import { callAIWithFallback, buildGroundedSystemPrompt, BANGLA_SYSTEM_PROMPT } from "./lib/ai";
import { getDb } from "./queries/connection";
import { productScores, researchJobs, products } from "@db/schema";
import { scoreProduct } from "./lib/scoring";
import { eq } from "drizzle-orm";


export const analysisRouter = createRouter({
  // ── Analyze Product (queue-based to bypass 8s timeout) ──
  analyzeProduct: authedQuery
    .input(
      z.object({
        title: z.string(),
        asin: z.string(),
        marketplace: z.string().default("US"),
        productUrl: z.string().optional(),
        isManual: z.boolean().default(false),
        price: z.number().optional(),
        weight: z.number().optional(),
        bsr: z.number().optional(),
        reviewCount: z.number().optional(),
        rating: z.number().optional(),
        sellerCount: z.number().optional(),
        category: z.string().optional(),
        hasBattery: z.boolean().optional(),
        isElectronic: z.boolean().optional(),
        isFragile: z.boolean().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = getDb();

      let jobInput = input.productUrl || input.title;
      let jobType = input.productUrl ? "url" : "keyword";

      if (input.isManual) {
        jobType = "manual";
        jobInput = JSON.stringify({
          title: input.title,
          asin: input.asin,
          price: input.price,
          weight: input.weight,
          bsr: input.bsr,
          reviewCount: input.reviewCount,
          rating: input.rating,
          sellerCount: input.sellerCount,
          category: input.category,
          hasBattery: input.hasBattery,
          isElectronic: input.isElectronic,
          isFragile: input.isFragile,
        });
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
        analysisData: { ...productData, calculatedAt: new Date().toISOString() },
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

      const trendsText = await callAIWithFallback([
        { role: "system", content: BANGLA_SYSTEM_PROMPT },
        { role: "user", content: prompt },
      ], 0.5, 2000);

      return {
        keyword: input.keyword,
        aiAnalysis: trendsText,
      };
    }),
});

