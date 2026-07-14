import { Hono } from "hono";
import { z } from "zod";
import { env } from "./lib/env";
import { getDb } from "./queries/connection";
import { researchJobs, reports, products, productScores, alerts, productSnapshots, keywordSearches, keywordSearchListings } from "@db/schema";
import { eq, and, desc } from "drizzle-orm";
import { callAIWithFallback, buildGroundedSystemPrompt } from "./lib/ai";
import { TRPCError } from "@trpc/server";
import { scoreProduct, extractSpecsFromReport, ProductInput } from "./lib/scoring";
import { fetchListingsForKeyword } from "./lib/amazon-paapi";
import { assessMarket, scoreListing, mapToKeywordSearchListing } from "./lib/listing-analysis";
import { appRouter } from "./router";

/**
 * Hono router for PUBLIC cron endpoints.
 * These are called by cron-jobs.org (or any external scheduler).
 * Protected by x-cron-secret header.
 */

const cronApp = new Hono();

// Middleware: verify cron secret
const requireCronSecret = async (c: any, next: any) => {
  const secret = c.req.header("x-cron-secret");
  if (!env.cronSecret || secret !== env.cronSecret) {
    return c.json({ error: "Unauthorized — invalid or missing x-cron-secret" }, 401);
  }
  await next();
} catch (err: any) {
  return c.json({ ok: false, error: err.message }, 500);
};

// ── 2. Process Pending Keyword Search Jobs ────────────────────────────
// Called every 5 minutes by cron-jobs.org.
// This bypasses Vercel's 8s function timeout because:
// - The cron job has 300s maxDuration in vercel.json
// - The request comes from outside Vercel's HTTP gateway

cronApp.post("/process-keyword-search", async (c) => {
  const db = getDb();

  // Pick one pending keyword search (FIFO)
  const pending = await db
    .select()
    .from(keywordSearches)
    .where(eq(keywordSearches.status, "pending"))
    .orderBy(keywordSearches.createdAt)
    .limit(1);

  if (pending.length === 0) {
    return c.json({ ok: true, processed: 0, message: "No pending keyword searches" });
  }

  const search = pending[0];

  // Mark as running
  await db
    .update(keywordSearches)
    .set({ status: "running", startedAt: new Date() })
    .where(eq(keywordSearches.id, search.id));

  try {
    // Fetch listings from Amazon PA-API
    const { keyword, marketplace } = search;
    const result = await fetchListingsForKeyword(keyword, marketplace);

    // Insert listings into database
    const listingsToInsert = result.items.map((item, index) => 
      mapToKeywordSearchListing(item, search.id, index + 1, 50, "vulnerable")
    );

    await db.insert(keywordSearchListings).values(listingsToInsert);

    // Calculate market assessment
    const marketAssessment = assessMarket(result.items, result.totalResultCount);

    // Score each listing
    const scoredListings = result.items.map((item, index) => {
      const scoreResult = scoreListing(item, {
        medianReviews: marketAssessment.avgReviewCount,
        medianPrice: marketAssessment.avgPrice,
        topBrand: "", // Will be calculated in assessMarket
      });
      return mapToKeywordSearchListing(item, search.id, index + 1, scoreResult.score, scoreResult.verdict);
    });

    // Update listings with scores
    for (const listing of scoredListings) {
      await db
        .update(keywordSearchListings)
        .set({
          perListingScore: listing.perListingScore,
          perListingVerdict: listing.perListingVerdict,
        })
        .where(eq(keywordSearchListings.id, listing.id));
    }

    // Generate AI summary report using grounded prompt
    const systemPrompt = await buildGroundedSystemPrompt(marketplace);
    
    const userPrompt = `## কীওয়ার্ড: "${keyword}"
## মার্কেটপ্লেস: ${marketplace}
## মোট ফলাফল: ${result.totalResultCount}

### মার্কেট ওভারভিউ:
- গড় প্রাইস: $${marketAssessment.avgPrice.toFixed(2)}
- গড় রিভিউ: ${marketAssessment.avgReviewCount.toFixed(0)}
- ব্র্যান্ড কনসেন্ট্রেশন: ${(marketAssessment.topBrandShare * 100).toFixed(1)}%
- প্রাইস স্প্রেড: ${(marketAssessment.priceSpreadRatio * 100).toFixed(1)}%
- রিভিউ গ্যাপ: ${(marketAssessment.reviewCountGiniLike * 100).toFixed(1)}%

### মার্কেট ভারডিক্ট: ${marketAssessment.marketVerdict}
### কারণ: ${marketAssessment.marketVerdictReason}

### সেরা সুযোগ: ${marketAssessment.bestOpportunityAsin || "কোনোটিই নয়"}

---

এই মার্কেট সম্পর্কে একজন নতুন ব্যবসায়ীর জন্য বিস্তারিত বিশ্লেষণ এবং সুপারিশ তৈরি করুন।`;

    const aiResult = await callAIWithFallback([
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ]);

    // Update search with results
    await db
      .update(keywordSearches)
      .set({
        status: "completed",
        totalResultCount: result.totalResultCount,
        aggregateScores: marketAssessment as any,
        summaryReport: aiResult,
        completedAt: new Date(),
      })
      .where(eq(keywordSearches.id, search.id));

    return c.json({ ok: true, processed: 1, searchId: search.id, totalListings: result.items.length });
  } catch (err: any) {
    // Mark search as failed
    await db
      .update(keywordSearches)
      .set({ status: "failed", error: err.message })
      .where(eq(keywordSearches.id, search.id));

    return c.json({ ok: false, processed: 0, searchId: search.id, error: err.message }, 500);
  }
});

// ── 3. Check Product Alerts ──────────────────────────────────────
  const db = getDb();

  // Pick one pending job (FIFO)
  const pending = await db
    .select()
    .from(researchJobs)
    .where(eq(researchJobs.status, "pending"))
    .orderBy(researchJobs.createdAt)
    .limit(1);

  if (pending.length === 0) {
    return c.json({ ok: true, processed: 0, message: "No pending jobs" });
  }

  const job = pending[0];

  // Mark as running
  await db
    .update(researchJobs)
    .set({ status: "running", startedAt: new Date() })
    .where(eq(researchJobs.id, job.id));

  try {
    const isManual = job.inputType === "manual";
    let manualData = null;
    if (isManual) {
      try {
        manualData = JSON.parse(job.input);
      } catch (e) {
        console.error("Failed to parse manual job input:", e);
      }
    }

    // Build the research prompt with structured format requirements
    const prompt = isManual
      ? `🔍 **ম্যানুয়াল প্রোডাক্ট এন্ট্রি**:
প্রোডাক্ট নাম: ${manualData.title}
ASIN: ${manualData.asin}
মূল্য: ${manualData.price}
ওজন: ${manualData.weight} lbs
BSR: ${manualData.bsr}
রিভিউ: ${manualData.reviewCount}
রেটিং: ${manualData.rating}
সেলার সংখ্যা: ${manualData.sellerCount}
ক্যাটাগরি: ${manualData.category || "General"}
বৈশিষ্ট্য: ${[
        manualData.hasBattery ? "ব্যাটারি আছে" : "",
        manualData.isElectronic ? "ইলেকট্রনিক্স" : "",
        manualData.isFragile ? "ভঙ্গুর" : "",
      ].filter(Boolean).join(", ") || "স্ট্যান্ডার্ড"}

আপনাকে একটি বিস্তারিত Amazon FBA রিসার্চ রিপোর্ট তৈরি করতে হবে। নিচের ফরম্যাট অনুসরণ করুন:

# 📋 রিপোর্ট ওভারভিউ
- প্রোডাক্ট নাম ও সংক্ষিপ্ত বিবরণ: ${manualData.title} (ASIN: ${manualData.asin})
- মার্কেটপ্লেস: ${job.marketplace}
- বিশ্লেষণ তারিখ: ${new Date().toLocaleDateString('bn-BD')}

# 📊 মার্কেট অ্যানালাইসিস
| মেট্রিক | ভ্যালু | মন্তব্য |
|---------|--------|--------|
| মার্কেট সাইজ | | BSR: ${manualData.bsr} |
| সিজনালিটি | | |
| ট্রেন্ড | | |
| চাহিদা স্কোর | /১০ | |

# ⚔️ কম্পিটিশন অ্যানালাইসিস
| মেট্রিক | ভ্যালু | মন্তব্য |
|---------|--------|--------|
| সেলার সংখ্যা | ${manualData.sellerCount} | |
| অ্যাভারেজ রিভিউ | ${manualData.reviewCount} | |
| ব্র্যান্ড ডোমিনেন্স | | |
| এন্ট্রি ব্যারিয়ার | /১০ | |

# 💰 প্রফিটাবিলিটি অ্যানালাইসিস
|---------|--------|--------|
| এস্টিমেটেড প্রাইজ | ${manualData.price} | |
| FBA ফি | | |
| সোর্সিং কস্ট | | |
| নেট মার্জিন | % | |
| মাসিক সেলস | | |

# ⚠️ রিস্ক অ্যানালাইসিস
- 🔴 হাই রিস্ক: ${manualData.isFragile ? "কাঁচ/ভঙ্গুর হওয়ার ঝুঁকি" : ""}
- 🟡 মিডিয়াম রিস্ক: ${manualData.isElectronic ? "ইলেকট্রনিক্স হওয়ার ঝুঁকি" : ""}
- 🟢 লো রিস্ক: ${!manualData.isFragile && !manualData.isElectronic ? "কম জটিল প্রোডাক্ট" : ""}

# 🏆 ১৩-পয়েন্ট ভ্যালিডেশন স্কোর
| # | ক্রাইটেরিয়া | স্কোর | ম্যাক্স |
|---|-------------|-------|--------|
| ১ | প্রাইজ স্কোর | /১০ | ১০ |
| ২ | সাইজ/ওয়েট | /১০ | ১০ |
| ৩ | মার্কেট সাইজ | /১০ | ১০ |
| ৪ | রিভিউ ব্যারিয়ার | /১০ | ১০ |
| ৫ | ডিফারেন্সিয়েশন | /১০ | ১০ |
| ৬ | সিজনালিটি | /১০ | ১০ |
| ৭ | কমপ্লেক্সিটি | /১০ | ১০ |
| ৮ | রিটার্ন রেট | /১০ | ১০ |
| ৯ | ব্র্যান্ড ডোমিনেন্স | /১০ | ১০ |
| ১০ | ট্রেন্ড | /১০ | ১০ |
| ১১ | ডিফেন্সিবিলিটি | /১০ | ১০ |
| ১২ | ম্যানুফ্যাকচারেবিলিটি | /১০ | ১০ |
| ১৩ | মার্জিন | /১০ | ১০ |
| | **মোট** | **/১৩০** | **১৩০** |

# 🎯 চূড়ান্ত সুপারিশ
**গ্রেড: [A/B/C]** | **স্কোর: /১৩০**

## 📋 পরবর্তী ধাপ (Action Plan)
১. 
২. 
৩. 
৪. 

---
*রিপোর্ট জেনারেটেড: ${new Date().toLocaleDateString('bn-BD')}*`
      : job.inputType === "url"
      ? `🔍 **প্রোডাক্ট**: ${job.input}

আপনাকে একটি বিস্তারিত Amazon FBA রিসার্চ রিপোর্ট তৈরি করতে হবে। নিচের ফরম্যাট অনুসরণ করুন:

# 📋 রিপোর্ট ওভারভিউ
- প্রোডাক্ট নাম ও সংক্ষিপ্ত বিবরণ
- মার্কেটপ্লেস (Amazon US/UK/EU)
- বিশ্লেষণ তারিখ

# 📊 মার্কেট অ্যানালাইসিস
| মেট্রিক | ভ্যালু | মন্তব্য |
|---------|--------|--------|
| মার্কেট সাইজ | | |
| সিজনালিটি | | |
| ট্রেন্ড | | |
| চাহিদা স্কোর | /১০ | |

# ⚔️ কম্পিটিশন অ্যানালাইসিস
| মেট্রিক | ভ্যালু | মন্তব্য |
|---------|--------|--------|
| কম্পিটিটর সংখ্যা | | |
| অ্যাভারেজ রিভিউ | | |
| ব্র্যান্ড ডোমিনেন্স | | |
| এন্ট্রি ব্যারিয়ার | /১০ | |

# 💰 প্রফিটাবিলিটি অ্যানালাইসিস
| মেট্রিক | ভ্যালু | মন্তব্য |
|---------|--------|--------|
| এস্টিমেটেড প্রাইজ | $ | |
| FBA ফি | $ | |
| সোর্সিং কস্ট | $ | |
| নেট মার্জিন | % | |
| মাসিক সেলস | ইউনিট | |

# ⚠️ রিস্ক অ্যানালাইসিস
- 🔴 হাই রিস্ক: 
- 🟡 মিডিয়াম রিস্ক: 
- 🟢 লো রিস্ক: 

# 🏆 ১৩-পয়েন্ট ভ্যালিডেশন স্কোর
| # | ক্রাইটেরিয়া | স্কোর | ম্যাক্স |
|---|-------------|-------|--------|
| ১ | প্রাইজ স্কোর | /১০ | ১০ |
| ২ | সাইজ/ওয়েট | /১০ | ১০ |
| ৩ | মার্কেট সাইজ | /১০ | ১০ |
| ৪ | রিভিউ ব্যারিয়ার | /১০ | ১০ |
| ৫ | ডিফারেন্সিয়েশন | /১০ | ১০ |
| ৬ | সিজনালিটি | /১০ | ১০ |
| ৭ | কমপ্লেক্সিটি | /১০ | ১০ |
| ৮ | রিটার্ন রেট | /১০ | ১০ |
| ৯ | ব্র্যান্ড ডোমিনেন্স | /১০ | ১০ |
| ১০ | ট্রেন্ড | /১০ | ১০ |
| ১১ | ডিফেন্সিবিলিটি | /১০ | ১০ |
| ১২ | ম্যানুফ্যাকচারেবিলিটি | /১০ | ১০ |
| ১৩ | মার্জিন | /১০ | ১০ |
| | **মোট** | **/১৩০** | **১৩০** |

# 🎯 চূড়ান্ত সুপারিশ
**গ্রেড: [A/B/C]** | **স্কোর: /১৩০**

## 📋 পরবর্তী ধাপ (Action Plan)
১. 
২. 
৩. 
৪. 

---
*রিপোর্ট জেনারেটেড: ${new Date().toLocaleDateString('bn-BD')}*`
      : `🔍 **কীওয়ার্ড**: "${job.input}"

আপনাকে একটি বিস্তারিত Amazon FBA রিসার্চ রিপোর্ট তৈরি করতে হবে। নিচের ফরম্যাট অনুসরণ করুন:

# 📋 রিপোর্ট ওভারভিউ
- কীওয়ার্ড: "${job.input}"
- মার্কেটপ্লেস: ${job.marketplace}
- বিশ্লেষণ তারিখ: ${new Date().toLocaleDateString('bn-BD')}

# 📊 মার্কেট অ্যানালাইসিস
| মেট্রিক | ভ্যালু | মন্তব্য |
|---------|--------|--------|
| মার্কেট সাইজ | | |
| সিজনালিটি | | |
| ট্রেন্ড | | |
| চাহিদা স্কোর | /১০ | |

# ⚔️ কম্পিটিশন অ্যানালাইসিস
| মেট্রিক | ভ্যালু | মন্তব্য |
|---------|--------|--------|
| কম্পিটিটর সংখ্যা | | |
| অ্যাভারেজ রিভিউ | | |
| ব্র্যান্ড ডোমিনেন্স | | |
| এন্ট্রি ব্যারিয়ার | /১০ | |

# 💰 প্রফিটাবিলিটি অ্যানালাইসিস
| মেট্রিক | ভ্যালু | মন্তব্য |
|---------|--------|--------|
| এস্টিমেটেড প্রাইজ | $ | |
| FBA ফি | $ | |
| সোর্সিং কস্ট | $ | |
| নেট মার্জিন | % | |
| মাসিক সেলস | ইউনিট | |

# ⚠️ রিস্ক অ্যানালাইসিস
- 🔴 হাই রিস্ক: 
- 🟡 মিডিয়াম রিস্ক: 
- 🟢 লো রিস্ক: 

# 🏆 ১৩-পয়েন্ট ভ্যালিডেশন স্কোর
| # | ক্রাইটেরিয়া | স্কোর | ম্যাক্স |
|---|-------------|-------|--------|
| ১ | প্রাইজ স্কোর | /১০ | ১০ |
| ২ | সাইজ/ওয়েট | /১০ | ১০ |
| ৩ | মার্কেট সাইজ | /১০ | ১০ |
| ৪ | রিভিউ ব্যারিয়ার | /১০ | ১০ |
| ৫ | ডিফারেন্সিয়েশন | /১০ | ১০ |
| ৬ | সিজনালিটি | /১০ | ১০ |
| ৭ | কমপ্লেক্সিটি | /১০ | ১০ |
| ৮ | রিটার্ন রেট | /১০ | ১০ |
| ৯ | ব্র্যান্ড ডোমিনেন্স | /১০ | ১০ |
| ১০ | ট্রেন্ড | /১০ | ১০ |
| ১১ | ডিফেন্সিবিলিটি | /১০ | ১০ |
| ১২ | ম্যানুফ্যাকচারেবিলিটি | /১০ | ১০ |
| ১৩ | মার্জিন | /১০ | ১০ |
| | **মোট** | **/১৩০** | **১৩০** |

# 🎯 চূড়ান্ত সুপারিশ
**গ্রেড: [A/B/C]** | **স্কোর: /১৩০**

## 📋 পরবর্তী ধাপ (Action Plan)
১. 
২. 
৩. 
৪. 

---
*রিপোর্ট জেনারেটেড: ${new Date().toLocaleDateString('bn-BD')}*`;

    const systemPrompt = await buildGroundedSystemPrompt(job.marketplace || "US");
    const result = await callAIWithFallback([
      { role: "system", content: systemPrompt },
      { role: "user", content: prompt },
    ]);

    // Generate 13-point scores from the generated report
    const specs: ProductInput = isManual ? {
      price: Number(manualData.price),
      weight: Number(manualData.weight || 1),
      bsr: Number(manualData.bsr),
      reviewCount: Number(manualData.reviewCount),
      sellerCount: Number(manualData.sellerCount),
      category: manualData.category || "most_categories",
      hasBattery: !!manualData.hasBattery,
      isElectronic: !!manualData.isElectronic,
      isFragile: !!manualData.isFragile,
      rating: manualData.rating ? Number(manualData.rating) : undefined,
      salesEstimate: undefined,
    } : extractSpecsFromReport(result);

    const { scores, totalScore, grade, recommendation } = await scoreProduct(specs);

    // Create a product first (so report has a valid productId FK)
    let productId: number;
    try {
      const productResult = await db
        .insert(products)
        .values({
          userId: job.userId || null,
          asin: isManual ? manualData.asin : ("RESEARCH-" + job.id),
          title: isManual ? manualData.title : job.input,
          price: isManual ? String(manualData.price) : (specs.price ? String(specs.price) : null),
          bsr: isManual ? manualData.bsr : (specs.bsr || null),
          reviewCount: isManual ? manualData.reviewCount : (specs.reviewCount || null),
          rating: isManual ? String(manualData.rating) : (specs.rating ? String(specs.rating) : null),
          sellerCount: isManual ? manualData.sellerCount : (specs.sellerCount || null),
          salesEstimate: isManual ? null : (specs.salesEstimate || null),
          bsrCategory: isManual ? manualData.category : (specs.category || null),
          marketplace: job.marketplace || "US",
          status: "researching",
        })
        .returning();

      if (!productResult || productResult.length === 0 || !productResult[0].id) {
        throw new Error("Product insert failed: no ID returned");
      }
      productId = productResult[0].id;
    } catch (productErr: any) {
      // If product insert fails, mark job failed and rethrow
      await db
        .update(researchJobs)
        .set({ status: "failed", error: "Product insert failed: " + productErr.message })
        .where(eq(researchJobs.id, job.id));
      throw new Error("Product insert failed: " + productErr.message);
    }

    // Save report with the real productId
    try {
      await db.insert(reports).values({
        productId: productId,
        userId: job.userId ?? null,
        title: job.input,
        content: result,
        summary: result.substring(0, 500) + "...",
        marketAnalysis: result,
        competitionAnalysis: result,
        profitAnalysis: result,
        riskAnalysis: result,
        recommendation,
        language: "bn",
      });
    } catch (reportErr: any) {
      // If report insert fails, still mark job completed with result
      console.error("[cron] Report insert failed:", reportErr.message);
    }

    // Save scores to productScores table
    await db.insert(productScores).values({
      productId: productId,
      userId: job.userId || 0,
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
        price: specs.price,
        weight: specs.weight,
        bsr: specs.bsr,
        reviewCount: specs.reviewCount,
        sellerCount: specs.sellerCount,
        category: specs.category,
        hasBattery: specs.hasBattery,
        isElectronic: specs.isElectronic,
        isFragile: specs.isFragile,
        calculatedAt: new Date().toISOString(),
      },
    });

    // Mark job as completed
    await db
      .update(researchJobs)
      .set({
        status: "completed",
        result,
        scores: scores as any,
        completedAt: new Date(),
      })
      .where(eq(researchJobs.id, job.id));

    return c.json({ ok: true, processed: 1, jobId: job.id, productId });
  } catch (err: any) {
    // Mark job as failed
    await db
      .update(researchJobs)
      .set({ status: "failed", error: err.message })
      .where(eq(researchJobs.id, job.id));

    return c.json({ ok: false, processed: 0, jobId: job.id, error: err.message }, 500);
  }
});

// ── 2. Check Product Alerts ──────────────────────────────────────
cronApp.post("/check-alerts", async (c) => {
  try {
    const caller = appRouter.createCaller({
      req: c.req.raw,
      resHeaders: new Headers(),
    });
    const result = await caller.alert.checkChanges({ cronSecret: env.cronSecret });
    return c.json({ ok: true, ...result });
  } catch (err: any) {
    return c.json({ ok: false, error: err.message }, 500);
  }
});

// ── 3. Setup Cron Jobs (one-time admin endpoint) ─────────────────
cronApp.post("/setup-jobs", async (c) => {
  const { setupCronJobs } = await import("./lib/cron-jobs");
  const baseUrl = c.req.header("x-app-base-url") || `https://${c.req.header("host")}`;

  try {
    const result = await setupCronJobs(baseUrl);
    return c.json({ ok: true, ...result });
  } catch (err: any) {
    return c.json({ ok: false, error: err.message }, 500);
  }
});

export default cronApp;
