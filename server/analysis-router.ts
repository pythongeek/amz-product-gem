import { z } from "zod";
import { createRouter, authedQuery } from "./middleware";
import { callKimi, BANGLA_SYSTEM_PROMPT } from "./lib/kimi";
import { getDb } from "./queries/connection";
import { productScores } from "@db/schema";

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
  analyzeProduct: authedQuery
    .input(
      z.object({
        title: z.string(),
        asin: z.string(),
        marketplace: z.string().default("US"),
        productUrl: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const mockData = generateMockProductData(input.title);

      const discoveryPrompt = `আপনি একজন Amazon FBA বিশেষজ্ঞ। "${input.title}" প্রোডাক্টটি বিশ্লেষণ করুন।
      
এই তথ্যগুলো ব্যবহার করুন:
- ASIN: ${input.asin}
- বাজার: ${input.marketplace}
- প্রাইজ: $${mockData.price}
- রেটিং: ${mockData.rating}/5 (${mockData.reviewCount} রিভিউ)
- BSR: #${mockData.bsr}
- সেলার সংখ্যা: ${mockData.sellerCount} (FBA: ${mockData.fbaSellers})
- বিক্রির পরিমাণ: ~${mockData.salesEstimate}/মাস

বাংলায় এই ফরম্যাটে উত্তর দিন:
১. প্রোডাক্ট সারাংশ
২. মার্কেট ডিমান্ড (চাহিদা বিশ্লেষণ)
৩. প্রতিযোগিতা পর্যালোচনা
৪. প্রাইজ অ্যানালাইসিস
৫. সেলস ভেলোসিটি
৬. লাভের সম্ভাবনা
৭. ঝুঁকি বিষয়
৮. সুপারিশ (PASS/CAUTION/FAIL)`;

      const analysis = await callKimi([
        { role: "system", content: BANGLA_SYSTEM_PROMPT },
        { role: "user", content: discoveryPrompt },
      ]);

      return {
        analysis,
        mockData,
        title: input.title,
        asin: input.asin,
        marketplace: input.marketplace,
      };
    }),

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

      const report = await callKimi([
        { role: "system", content: BANGLA_SYSTEM_PROMPT },
        { role: "user", content: reportPrompt },
      ]);

      return { report };
    }),

  getTrends: authedQuery
    .input(z.object({ keyword: z.string() }))
    .query(async ({ input }) => {
      return {
        keyword: input.keyword,
        trendDirection: Math.random() > 0.3 ? "রাইজিং (↗️)" : "ফলিং (↘️)",
        seasonality: "বছরজুড়ে চাহিদা (Year-round)",
        peakMonths: ["জানুয়ারি", "জুন", "নভেম্বর", "ডিসেম্বর"],
        relatedQueries: [
          `${input.keyword} bundle`,
          `best ${input.keyword} 2026`,
          `${input.keyword} for home`,
          `premium ${input.keyword}`,
        ],
        interestByRegion: [
          { region: "California", interest: 100 },
          { region: "Texas", interest: 85 },
          { region: "Florida", interest: 78 },
          { region: "New York", interest: 72 },
        ],
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
