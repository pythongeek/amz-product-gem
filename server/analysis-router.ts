import { z } from "zod";
import { createRouter, authedQuery } from "./middleware";
import { callAIWithFallback, BANGLA_SYSTEM_PROMPT } from "./lib/ai";
import { getDb } from "./queries/connection";
import { productScores, researchJobs } from "@db/schema";

function generateMockProductData(_title: string) {
  return {
    price: (Math.random() * 40 + 10).toFixed(2),
    rating: (Math.random() * 2 + 3).toFixed(1),
    reviewCount: Math.floor(Math.random() * 500 + 20),
    bsr: Math.floor(Math.random() * 50000 + 100),
    sellerCount: Math.floor(Math.random() * 20 + 5),
    fbaSellers: Math.floor(Math.random() * 15 + 3),
    salesEstimate: Math.floor(Math.random() * 10000 + 500),
    reviewVelocity: (Math.random() * 5 + 0.5).toFixed(2),
  };
}

export const analysisRouter = createRouter({
  // ── Analyze Product (queue-based to bypass 8s timeout) ──
  analyzeProduct: authedQuery
    .input(
      z.object({
        title: z.string(),
        asin: z.string(),
        marketplace: z.string().default("US"),
        productUrl: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = getDb();

      // Queue the job instead of doing it inline
      const [job] = await db
        .insert(researchJobs)
        .values({
          userId: ctx.user.id,
          input: input.productUrl || input.title,
          inputType: input.productUrl ? "url" : "keyword",
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

      const scores = {
        priceScore: calculatePriceScore(productData.price),
        sizeWeightScore: 8,
        marketSizeScore: calculateMarketSizeScore(productData.bsr),
        reviewBarrierScore: calculateReviewBarrierScore(productData.reviewCount),
        differentiationScore: Math.floor(Math.random() * 5) + 5,
        seasonalityScore: 7,
        complexityScore: calculateComplexityScore(productData),
        returnRateScore: 7,
        brandDominanceScore: calculateBrandDominanceScore(productData.sellerCount),
        trendScore: Math.floor(Math.random() * 4) + 6,
        defensibilityScore: 6,
        manufacturabilityScore: productData.price > 15 ? 8 : 6,
        marginScore: calculateMarginScore(productData.price),
      };

      const totalScore = Object.values(scores).reduce((a, b) => a + b, 0);
      const grade = totalScore >= 100 ? "A" : totalScore >= 70 ? "B" : "C";
      const recommendation =
        grade === "A"
          ? "যান (GO) — ভাল সুযোগ"
          : grade === "B"
          ? "সতর্কতা (CAUTION) — ঝুঁকি আছে"
          : "বর্জন (FAIL) — এড়িয়ে চলুন";

      const db = getDb();
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

      const report = await callAIWithFallback([
        { role: "system", content: BANGLA_SYSTEM_PROMPT },
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

function calculatePriceScore(price: number): number {
  if (price >= 20 && price <= 35) return 10;
  if (price >= 15 && price <= 50) return 8;
  if (price > 50 && price <= 80) return 5;
  return 3;
}
function calculateMarketSizeScore(bsr: number): number {
  if (bsr < 5000) return 9;
  if (bsr < 20000) return 8;
  if (bsr < 50000) return 6;
  return 4;
}
function calculateReviewBarrierScore(reviewCount: number): number {
  if (reviewCount < 50) return 10;
  if (reviewCount < 150) return 8;
  if (reviewCount < 500) return 5;
  return 3;
}
function calculateComplexityScore(data: {
  hasBattery?: boolean;
  isElectronic?: boolean;
  isFragile?: boolean;
}): number {
  let score = 10;
  if (data.hasBattery) score -= 3;
  if (data.isElectronic) score -= 3;
  if (data.isFragile) score -= 2;
  return Math.max(score, 2);
}
function calculateBrandDominanceScore(sellerCount: number): number {
  if (sellerCount > 15) return 7;
  if (sellerCount > 10) return 6;
  if (sellerCount > 5) return 4;
  return 3;
}
function calculateMarginScore(price: number): number {
  if (price >= 25 && price <= 50) return 9;
  if (price >= 15 && price <= 80) return 7;
  return 5;
}
