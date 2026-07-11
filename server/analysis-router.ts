import { z } from "zod";
import { createRouter, authedQuery } from "./middleware";
import { callAIWithFallback, buildGroundedSystemPrompt } from "./lib/ai";
import { getDb } from "./queries/connection";
import { productScores, researchJobs } from "@db/schema";
import { scoreProduct } from "./lib/scoring";


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
      });

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

  // ── Get Trends (mock data for now) ──
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

