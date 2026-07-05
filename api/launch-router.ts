import { z } from "zod";
import { createRouter, authedQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { launchStrategies } from "@db/schema";
import { eq } from "drizzle-orm";
import { callKimi, BANGLA_SYSTEM_PROMPT } from "./lib/kimi";

export const launchRouter = createRouter({
  generate: authedQuery
    .input(
      z.object({
        productId: z.number(),
        productTitle: z.string(),
        category: z.string().optional(),
        targetPrice: z.number().optional(),
        competitorPrice: z.number().optional(),
        budget: z.number().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const prompt = `"${input.productTitle}" প্রোডাক্টটি Amazon-ে লঞ্চ করার জন্য একটি সম্পূর্ণ স্ট্র্যাটেজি তৈরি করুন।

তথ্য:
- ক্যাটাগরি: ${input.category || "General"}
- টার্গেট প্রাইজ: $${input.targetPrice || "N/A"}
- কম্পিটিটর প্রাইজ: $${input.competitorPrice || "N/A"}
- বাজেট: $${input.budget || "N/A"}

বাংলায় এই সেকশনগুলোতে দিন:

# 🎯 লিস্টিং অপ্টিমাইজেশন
- SEO টাইটল (২০০ ক্যারেক্টার)
- ৫টি বুলেট পয়েন্ট
- ব্যাকএন্ড কীওয়ার্ড

# 💰 প্রাইসিং স্ট্র্যাটেজি
- ফেজ ১ (১-১৪ দিন): পেনেট্রেশন প্রাইসিং
- ফেজ ২ (১৫-৪৫ দিন): কম্পিটিটিভ প্রাইসিং
- ফেজ ৩ (৪৬+ দিন): প্রিমিয়াম প্রাইসিং

# 📢 PPC ক্যাম্পেইন স্ট্রাকচার
- অটো ক্যাম্পেইন সেটআপ
- ম্যানুয়াল ক্যাম্পেইন
- বাজেট অ্যালোকেশন

# ⭐ রিভিউ জেনারেশন প্ল্যান
- Vine প্রোগ্রাম
- রিভিউ রিকোয়েস্ট সিকোয়েন্স
- টার্গেট: ৩০ দিনে ৩০ রিভিউ

# 📦 ইনভেন্টরি প্ল্যানিং
- প্রথম অর্ডার: ৩০০-৫০০ ইউনিট
- রিঅর্ডার পয়েন্ট
- সেফটি স্টক

# 📅 Day 0-90 লঞ্চ টাইমলাইন
প্রতি সপ্তাহের কাজের তালিকা দিন।

# 📱 মার্কেটিং চ্যানেল
- TikTok, Instagram, Facebook, Pinterest
- ইনফ্লুয়েন্সার আউটরিচ

প্রতিটি সেকশনে বুলেট পয়েন্ট ও নির্দিষ্ট নাম্বার দিন।`;

      const strategy = await callKimi([
        { role: "system", content: BANGLA_SYSTEM_PROMPT },
        { role: "user", content: prompt },
      ]);

      const db = getDb();
      const result = await db
        .insert(launchStrategies)
        .values({
          productId: input.productId,
          userId: ctx.user.id,
          title: `${input.productTitle} - লঞ্চ স্ট্র্যাটেজি`,
          content: strategy,
          timeline: generateLaunchTimeline(),
          pricingStrategy: generatePricingStrategy(input.targetPrice, input.competitorPrice),
          ppcCampaign: generatePPCCampaign(),
          reviewStrategy: generateReviewStrategy(),
          inventoryPlan: generateInventoryPlan(),
          marketingChannels: generateMarketingChannels(),
        })
        .returning();

      return {
        strategy: result[0],
        fullText: strategy,
      };
    }),

  getByProduct: authedQuery
    .input(z.object({ productId: z.number() }))
    .query(async ({ input }) => {
      const db = getDb();
      return db
        .select()
        .from(launchStrategies)
        .where(eq(launchStrategies.productId, input.productId))
        .orderBy(launchStrategies.createdAt);
    }),
});

function generateLaunchTimeline() {
  return [
    { day: "০", task: "প্রোডাক্ট FBA-তে পৌঁছে, লিস্টিং লাইভ" },
    { day: "১-৭", task: "PPC অটো ক্যাম্পেইন, $৫০/দিন, সার্চ টার্ম মনিটরিং" },
    { day: "৭", task: "Vine-এ এনরোল, প্রথম রিভিউ রিকোয়েস্ট" },
    { day: "১৪", task: "অটো ক্যাম্পেইন ডেটা অ্যানালাইসিস, ম্যানুয়াল ক্যাম্পেইন লঞ্চ" },
    { day: "২১", task: "প্রথম Vine রিভিউ পোস্ট, প্রাইস অ্যাডজাস্টমেন্ট" },
    { day: "৩০", task: "BSR ট্র্যাজেক্টরি, TACoS, রিভিউ ভেলোসিটি ইভ্যালুয়েশন" },
    { day: "৪৫", task: "PPC অপ্টিমাইজেশন, প্রোডাক্ট টার্গেটিং ক্যাম্পেইন" },
    { day: "৬০", task: "উইনার্স vs লুজার্স অ্যানালাইসিস, রিঅর্ডার ডিসিশন" },
    { day: "৯০", task: "স্কেল উইনিং ক্যাম্পেইন, এক্সপেনশন প্ল্যান" },
  ];
}

function generatePricingStrategy(targetPrice?: number, competitorPrice?: number) {
  const marketAvg = competitorPrice || targetPrice || 29.99;
  return {
    phase1: { days: "১-১৪", price: (marketAvg * 0.88).toFixed(2), strategy: "পেনেট্রেশন প্রাইসিং (১২% কম)" },
    phase2: { days: "১৫-৪৫", price: marketAvg.toFixed(2), strategy: "কম্পিটিটিভ প্রাইসিং" },
    phase3: { days: "৪৬+", price: (marketAvg * 1.1).toFixed(2), strategy: "প্রিমিয়াম প্রাইসিং (১০% বেশি)" },
  };
}

function generatePPCCampaign() {
  return {
    autoCampaign: { budget: 50, duration: "Week 1-2", goal: "কনভার্টিং কীওয়ার্ড খুঁজুন" },
    manualExact: { budget: 75, duration: "Week 3+", goal: "প্রুভেন কীওয়ার্ডে বিড" },
    productTargeting: { budget: 25, duration: "Week 4+", goal: "কম্পিটিটর ASIN আট্যাক" },
    totalDailyBudget: 150,
    targetAcos: "২৫% (লঞ্চ), ২০% (ম্যাচিউর)",
  };
}

function generateReviewStrategy() {
  return {
    vineProgram: { units: 30, expectedReviews: 30, cost: "ফ্রি (Amazon Vine)" },
    requestReview: { method: "Amazon 'Request a Review' বাটন", timing: "ডেলিভারির ৫-৭ দিন পর" },
    followUp: { method: "কমপ্লায়েন্ট ইমেইল সিকোয়েন্স", count: 2 },
    target: "১৪ দিনে ১০ রিভিউ, ৩০ দিনে ৩০ রিভিউ",
  };
}

function generateInventoryPlan() {
  return {
    initialOrder: { units: "৩০০-৫০০", type: "টেস্ট অর্ডার" },
    reorderPoint: "৪৫ দিনের ইনভেন্টরি রেখে",
    reorderFormula: "(দৈনিক বিক্রি × ৪৫) + (দৈনিক বিক্রি × ৩০ সেফটি)",
    avoidQ4Overstock: true,
    avoidStockout: true,
  };
}

function generateMarketingChannels() {
  return [
    { channel: "TikTok", strategy: "প্রোডাক্ট ডেমো ভিডিও, বিফোর/আফটার কন্টেন্ট" },
    { channel: "Instagram", strategy: "লাইফস্টাইল ফটো, ইনফ্লুয়েন্সার সিডিং" },
    { channel: "Facebook", strategy: "Amazon লিস্টিং-এ রিটার্গেটিং অ্যাড" },
    { channel: "Pinterest", strategy: "ইনফোগ্রাফিক পিন (হাই ইন্টেন্ট ট্র্যাফিক)" },
    { channel: "YouTube", strategy: "মাইক্রো-ইনফ্লুয়েন্সার আউটরিচ" },
  ];
}
