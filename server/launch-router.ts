import { z } from "zod";
import { createRouter, authedQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { launchStrategies, products, productScores } from "@db/schema";
import { eq } from "drizzle-orm";
import { callAIWithFallback, BANGLA_SYSTEM_PROMPT } from "./lib/ai";

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
      const db = getDb();

      // Retrieve product specifications from database
      const productRows = await db
        .select()
        .from(products)
        .where(eq(products.id, input.productId))
        .limit(1);
      const product = productRows[0];
      if (!product) throw new Error("Product not found");

      // Retrieve validation scores to inspect battery/electronic/fragile flags
      const scoreRows = await db
        .select()
        .from(productScores)
        .where(eq(productScores.productId, product.id))
        .limit(1);
      const productScore = scoreRows[0];

      const analysisData = (productScore?.analysisData || {}) as any;
      const hasBattery = !!analysisData.hasBattery;
      const isElectronic = !!analysisData.isElectronic;
      const isFragile = !!analysisData.isFragile;

      const salesEstimate = product.salesEstimate || 300;
      const rating = product.rating ? parseFloat(String(product.rating)) : 4.0;
      const reviewCount = product.reviewCount || 0;

      // Ground the AI Prompt with real product constraints
      const prompt = `"${input.productTitle}" (ASIN: ${product.asin}) প্রোডাক্টটি Amazon-ে লঞ্চ করার জন্য একটি সম্পূর্ণ ডে-টু-ডে লঞ্চ স্ট্র্যাটেজি তৈরি করুন।

প্রোডাক্টের বাস্তব তথ্য:
- ক্যাটাগরি: ${input.category || product.bsrCategory || "General"}
- টার্গেট প্রাইজ: $${input.targetPrice || product.price || "N/A"}
- কম্পিটিটর প্রাইজ: $${input.competitorPrice || "N/A"}
- ব্যাটারি ফিচার: ${hasBattery ? "হ্যাঁ (MSDS/UN38.3 সার্টিফিকেট প্রয়োজন)" : "না"}
- ইলেকট্রনিক ফিচার: ${isElectronic ? "হ্যাঁ (FCC/CE কমপ্লায়েন্স প্রয়োজন)" : "না"}
- ভঙ্গুর প্রোডাক্ট: ${isFragile ? "হ্যাঁ (অতিরিক্ত বাবল র্যাপ এবং ৩-ফুট ড্রপ টেস্ট প্রয়োজন)" : "না"}
- মাসিক সেলস এস্টিমেট: ${salesEstimate} ইউনিট
- বর্তমান রিভিউ সংখ্যা: ${reviewCount} (রেটিং: ${rating}/5)

বাংলায় এই সেকশনগুলোতে বিবরণ দিন:

# 🎯 লিস্টিং অপ্টিমাইজেশন
- SEO টাইটল (২০০ ক্যারেক্টার)
- ৫টি সুবিধা ভিত্তিক বুলেট পয়েন্ট
- ব্যাকএন্ড কীওয়ার্ড (২৫০ বাইট)

# 💰 প্রাইসিং স্ট্র্যাটেজি
- ফেজ ১ (১-১৪ দিন): পেনেট্রেশন প্রাইসিং
- ফেজ ২ (১৫-৪৫ দিন): কম্পিটিটিভ প্রাইসিং
- ফেজ ৩ (৪৬+ দিন): প্রিমিয়াম প্রাইসিং (রিভিউ আসার পর)

# 📢 PPC ক্যাম্পেইন স্ট্রাকচার
- অটো ক্যাম্পেইন ও কীওয়ার্ড এক্সট্রাকশন
- ম্যানুয়াল এক্স্যাক্ট ম্যাচ ক্যাম্পেইন সেটআপ
- বাজেট ডিস্ট্রিবিউশন

# ⭐ রিভিউ জেনারেশন প্ল্যান
- Vine প্রোগ্রাম এনরোলমেন্ট গাইড
- কাস্টমার রিভিউ রিকোয়েস্ট অটোমেশন

# 📦 ইনভেন্টরি ও লজিস্টিকস প্ল্যানিং
- প্রথম অর্ডার ইউনিট পরিমাণ ও শিপিং মেথড (এয়ার বনাম সি)
- রিঅর্ডার পয়েন্ট গণনা

# 📅 Day 0-90 লঞ্চ টাইমলাইন
প্রতি সপ্তাহের নির্দিষ্ট কাজের তালিকা দিন।

ব্যবসায়িক টার্মগুলোর বাংলা অনুবাদ বন্ধনীতে দিন। টেবিল ও বুলেট পয়েন্ট ব্যবহার করুন।`;

      const strategy = await callAIWithFallback([
        { role: "system", content: BANGLA_SYSTEM_PROMPT },
        { role: "user", content: prompt },
      ]);

      const timelineData = generateLaunchTimeline(hasBattery, isElectronic, isFragile);
      const pricingData = generatePricingStrategy(input.targetPrice || (product.price ? parseFloat(String(product.price)) : 29.99), input.competitorPrice);
      const ppcData = generatePPCCampaign(input.category || product.bsrCategory || "General");
      const reviewData = generateReviewStrategy(reviewCount);
      const inventoryData = generateInventoryPlan(salesEstimate, isFragile);
      const marketingData = generateMarketingChannels();

      const result = await db
        .insert(launchStrategies)
        .values({
          productId: input.productId,
          userId: ctx.user.id,
          title: `${input.productTitle} - লঞ্চ স্ট্র্যাটেজি`,
          content: strategy,
          timeline: timelineData,
          pricingStrategy: pricingData,
          ppcCampaign: ppcData,
          reviewStrategy: reviewData,
          inventoryPlan: inventoryData,
          marketingChannels: marketingData,
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

function generateLaunchTimeline(hasBattery: boolean, isElectronic: boolean, isFragile: boolean) {
  const timeline = [
    { day: "০", task: "প্রোডাক্ট FBA গুদামে রিসিভ হয়েছে, লিস্টিং লাইভ করা হল।" },
  ];

  if (hasBattery) {
    timeline.push({ day: "১", task: "MSDS এবং UN38.3 ডকুমেন্ট সাবমিট করে বিপজ্জনক পণ্য (Dangerous Goods) ক্লিয়ারেন্স ভেরিফাই করুন।" });
  }
  if (isElectronic) {
    timeline.push({ day: "১-২", task: "FCC/CE ডিক্লেয়ারেশন কমপ্লায়েন্স সার্টিফিকেশন এবং ওয়ারেন্টি কার্ড আপলোড কনফার্ম করুন।" });
  }
  if (isFragile) {
    timeline.push({ day: "১", task: "FBA গুদামে বাবল র্যাপ এবং প্রটেক্টিভ প্যালেট ট্র্যাকিং ভেরিফাই করুন যাতে ডেলিভারি ট্রানজিটে ড্যামেজ না হয়।" });
  }

  timeline.push(
    { day: "১-৭", task: "PPC অটো ক্যাম্পেইন चालू করুন, কিওয়ার্ডের ডেটা ট্র্যাক করার জন্য দৈনিক বাজেট রাখুন।" },
    { day: "৭", task: "Amazon Vine প্রোগ্রামে প্রোডাক্টটি এনরোল করুন (৩০টি ফ্রি রিভিউ পাওয়ার জন্য)।" },
    { day: "১৪", task: "কনভার্টিং কীওয়ার্ড ফিল্টার করে ম্যানুয়াল ব্রড ও এক্স্যাক্ট ম্যাচ ক্যাম্পেইন লঞ্চ করুন।" },
    { day: "২১", task: "প্রথম Vine রিভিউ রিসিভ করার পর প্রাইজ ৫-১০% বাড়িয়ে এডজাস্ট করুন।" },
    { day: "৩০", task: "কনভার্সন রেট, CVR, এবং TACoS রিভিউ করুন। অতিরিক্ত নেগেটিভ কিওয়ার্ড অ্যাড করুন।" },
    { day: "৬০", task: "সেলস ভেলোসিটির ওপর ভিত্তি করে ৩য় মাসের শুরুতে পরবর্তী শিপমেন্টের রিঅর্ডার ডিসিশন নিন।" },
    { day: "৯০", task: "লঞ্চিং ফেজ শেষ। এখন প্রফিটেবল কিওয়ার্ডগুলোতে র্যাঙ্কিং ধরে রাখতে বিড অপ্টিমাইজ করুন।" }
  );

  return timeline;
}

function generatePricingStrategy(targetPrice: number, competitorPrice?: number) {
  const marketAvg = competitorPrice || targetPrice || 29.99;
  return {
    phase1: { days: "১-১৪", price: (marketAvg * 0.85).toFixed(2), strategy: "পেনেট্রেশন প্রাইসিং (১৫% ডিসকাউন্ট দিয়ে র্যাঙ্কিং বুস্ট)" },
    phase2: { days: "১৫-৪৫", price: marketAvg.toFixed(2), strategy: "কম্পিটিটিভ মার্কেট প্রাইজ" },
    phase3: { days: "৪৬+", price: (marketAvg * 1.08).toFixed(2), strategy: "প্রিমিয়াম ব্র্যান্ডেড প্রাইসিং (রিভিউ জমার পর মার্জিন বৃদ্ধির জন্য)" },
  };
}

function generatePPCCampaign(category: string) {
  const isCompetitive = /electronic|kitchen|beauty|home/i.test(category);
  const autoBudget = isCompetitive ? 60 : 35;
  const manualBudget = isCompetitive ? 80 : 45;
  const total = autoBudget + manualBudget + 25;

  return {
    autoCampaign: { budget: autoBudget, duration: "সপ্তাহ ১-২", goal: "কনভার্টিং লং-টেইল কীওয়ার্ড এক্সট্রাকশন" },
    manualExact: { budget: manualBudget, duration: "সপ্তাহ ৩+", goal: "হাই কনভার্টিং প্রুভেন সার্চ টার্ম র্যাঙ্কিং" },
    productTargeting: { budget: 25, duration: "সপ্তাহ ৪+", goal: "দুর্বল রেটিংযুক্ত প্রতিযোগী ASIN টার্গেটিং" },
    totalDailyBudget: total,
    targetAcos: isCompetitive ? "৩০% (লঞ্চ ফেজ)" : "২৫% (লঞ্চ ফেজ)",
  };
}

function generateReviewStrategy(currentReviews: number) {
  return {
    vineProgram: { units: 30, expectedReviews: 25, cost: "ফ্রি লাইসেন্স ফি" },
    requestReview: { method: "সিস্টেম জেনারেটেড 'Request a Review' অটোমেশন", timing: "ডেলিভারির ৫ দিন পর" },
    followUp: { method: "Amazon কমপ্লায়েন্ট কাস্টমার সাপোর্ট ফলোআপ", count: 1 },
    target: currentReviews > 10 ? "৩০ দিনে আরও ২৫টি ভেরিফাইড রিভিউ যোগ করা" : "১৪ দিনে ১০টি এবং ৩০ দিনে ৩০টি ভেরিফাইড রিভিউ",
  };
}

function generateInventoryPlan(salesEstimate: number, isFragile: boolean) {
  const safetyStock = Math.ceil(salesEstimate * 0.5); // 15 days safety
  const initialOrder = Math.max(300, Math.ceil(salesEstimate * 1.5)); // 1.5 months sales

  return {
    initialOrder: { units: initialOrder.toString(), type: isFragile ? "সি শিপমেন্ট (বাবল র্যাপ প্রটেকশনসহ)" : "এয়ার শিপমেন্ট (টেস্ট প্যাকেট)" },
    reorderPoint: `গুদামে ${safetyStock} ইউনিট অবশিষ্ঠ থাকতে`,
    reorderFormula: `(দৈনিক সেলস × ৪৫ দিন লিড টাইম) + ${safetyStock} সেফটি স্টক`,
    avoidQ4Overstock: true,
    avoidStockout: true,
  };
}

function generateMarketingChannels() {
  return [
    { channel: "TikTok / Reels", strategy: "Proaduct-এর প্রবলেম সলভিং ১-মিনিট ডেমো ভিডিও এবং ইনফ্লুয়েন্সার আউটরিচ।" },
    { channel: "Instagram", strategy: "উচ্চমানের লাইফস্টাইল ইমেজেস এবং গিভঅ্যাওয়ে ক্যাম্পেইন।" },
    { channel: "Amazon Post", strategy: "ফ্রি লাইভ ইমেজ ও গ্রাফিক্স আপলোড করে লিস্টিং ট্র্যাফিক বৃদ্ধি।" },
    { channel: "Pinterest", strategy: "হাই-কনভার্সন রিচ ডেকোরেশন পিন আপলোড।" },
  ];
}
