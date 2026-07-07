import { createRouter, authedQuery } from "./middleware";
import { z } from "zod";
import { callAIWithFallback, BANGLA_SYSTEM_PROMPT } from "./ai";
import { getDb } from "./queries/connection";
import { reports } from "@db/schema";

export const jobRouter = createRouter({
  // Background product analysis (existing)
  runAnalysisJob: authedQuery
    .input(
      z.object({
        productId: z.number(),
        title: z.string(),
        asin: z.string(),
        marketplace: z.string().default("US"),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const mockData = {
        price: (Math.random() * 40 + 10).toFixed(2),
        rating: (Math.random() * 2 + 3).toFixed(1),
        reviewCount: Math.floor(Math.random() * 500 + 20),
        bsr: Math.floor(Math.random() * 50000 + 100),
        sellerCount: Math.floor(Math.random() * 20 + 5),
        fbaSellers: Math.floor(Math.random() * 15 + 3),
        salesEstimate: Math.floor(Math.random() * 10000 + 500),
        reviewVelocity: (Math.random() * 5 + 0.5).toFixed(2),
      };

      const prompt = `আপনি একজন Amazon FBA বিশেষজ্ঞ। "${input.title}" প্রোডাক্টটি বিশ্লেষণ করুন।

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

      const analysis = await callAIWithFallback([
        { role: "system", content: BANGLA_SYSTEM_PROMPT },
        { role: "user", content: prompt },
      ]);

      const scores = {
        priceScore: calculatePriceScore(Number(mockData.price)),
        sizeWeightScore: 8,
        marketSizeScore: calculateMarketSizeScore(mockData.bsr),
        reviewBarrierScore: calculateReviewBarrierScore(mockData.reviewCount),
        differentiationScore: Math.floor(Math.random() * 5) + 5,
        seasonalityScore: 7,
        complexityScore: calculateComplexityScore(mockData),
        returnRateScore: 7,
        brandDominanceScore: calculateBrandDominanceScore(mockData.sellerCount),
        trendScore: Math.floor(Math.random() * 4) + 6,
        defensibilityScore: 6,
        manufacturabilityScore: Number(mockData.price) > 15 ? 8 : 6,
        marginScore: calculateMarginScore(Number(mockData.price)),
      };
      const total = Object.values(scores).reduce((a, b) => a + b, 0);
      const grade = total >= 100 ? "A" : total >= 70 ? "B" : "C";
      const recommendation =
        grade === "A"
          ? "যান (GO) — ভাল সুযোগ"
          : grade === "B"
          ? "সতর্কতা (CAUTION) — ঝুঁকি আছে"
          : "বর্জন (FAIL) — এড়িয়ে চলুন";

      const db = getDb();
      await db.insert(reports).values({
        productId: input.productId,
        userId: ctx.user.id,
        title: input.title,
        content: analysis,
        summary: analysis.substring(0, 500) + "...",
        marketAnalysis: analysis,
        competitionAnalysis: analysis,
        profitAnalysis: analysis,
        riskAnalysis: analysis,
        recommendation: recommendation,
        language: "bn",
      });

      return { success: true };
    }),

  // Immediate research trigger (new)
  triggerResearch: authedQuery
    .input(
      z.object({
        input: z.string(),
        userId: z.number(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const prompt = `Conduct immediate research on: ${input.input}. Provide a concise report in Bangla.`;
      const research = await callAIWithFallback([
        { role: "system", content: BANGLA_SYSTEM_PROMPT },
        { role: "user", content: prompt },
      ]);

      const db = getDb();
      await db.insert(reports).values({
        productId: null,
        userId: input.userId,
        title: input.input,
        content: research,
        summary: research.substring(0, 500) + "...",
        marketAnalysis: research,
        competitionAnalysis: research,
        profitAnalysis: research,
        riskAnalysis: research,
        recommendation: "Pending",
        language: "bn",
      });

      return { success: true };
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
