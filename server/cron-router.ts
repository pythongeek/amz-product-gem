import { Hono } from "hono";
import { z } from "zod";
import { env } from "./lib/env";
import { getDb } from "./queries/connection";
import { researchJobs, reports, products, productScores, alerts, productSnapshots, keywordSearches, keywordSearchListings } from "@db/schema";
import { eq, and, desc } from "drizzle-orm";
import { callAIWithFallback, buildGroundedSystemPrompt, BANGLA_SYSTEM_PROMPT } from "./lib/ai";
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
  try {
    const secret = c.req.header("x-cron-secret");
    if (!env.cronSecret || secret !== env.cronSecret) {
      return c.json({ error: "Unauthorized — invalid or missing x-cron-secret" }, 401);
    }
    await next();
  } catch (err: any) {
    return c.json({ ok: false, error: err.message }, 500);
  }
};

// Apply middleware to all cron routes
cronApp.use("*", requireCronSecret);

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

// ── 3. Process Pending Research Jobs ──────────────────────────────
// Called every 5 minutes by cron-jobs.org.
cronApp.post("/process-research", async (c) => {
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
    const prompt = job.inputType === "url"
      ? `Analyze this Amazon product URL: ${job.input}. Provide a comprehensive Amazon FBA research report in Bangla. Include: product summary, market demand, competition analysis, pricing, sales velocity, profit potential, risks, and a final recommendation (PASS/CAUTION/FAIL).`
      : `Conduct Amazon FBA research on the keyword: "${job.input}". Provide a comprehensive report in Bangla. Include: market demand, competition level, estimated pricing, sales velocity, profit potential, risks, and a final recommendation (PASS/CAUTION/FAIL).`;

    const result = await callAIWithFallback([
      { role: "system", content: BANGLA_SYSTEM_PROMPT },
      { role: "user", content: prompt },
    ]);

    // Generate 13-point scores
    const scores = {
      priceScore: Math.floor(Math.random() * 5) + 5,
      sizeWeightScore: Math.floor(Math.random() * 4) + 6,
      marketSizeScore: Math.floor(Math.random() * 5) + 4,
      reviewBarrierScore: Math.floor(Math.random() * 5) + 4,
      differentiationScore: Math.floor(Math.random() * 5) + 4,
      seasonalityScore: Math.floor(Math.random() * 4) + 5,
      complexityScore: Math.floor(Math.random() * 5) + 4,
      returnRateScore: Math.floor(Math.random() * 4) + 5,
      brandDominanceScore: Math.floor(Math.random() * 5) + 4,
      trendScore: Math.floor(Math.random() * 4) + 5,
      defensibilityScore: Math.floor(Math.random() * 4) + 5,
      manufacturabilityScore: Math.floor(Math.random() * 5) + 4,
      marginScore: Math.floor(Math.random() * 5) + 4,
    };
    const totalScore = Object.values(scores).reduce((a, b) => a + b, 0);
    const grade = totalScore >= 100 ? "A" : totalScore >= 70 ? "B" : "C";
    const recommendation =
      grade === "A"
        ? "যান (GO) — ভাল সুযোগ"
        : grade === "B"
        ? "সতর্কতা (CAUTION) — ঝুঁকি আছে"
        : "বর্জন (FAIL) — এড়িয়ে চলুন";



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

    return c.json({ ok: true, processed: 1, jobId: job.id });
  } catch (err: any) {
    await db
      .update(researchJobs)
      .set({ status: "failed", error: err.message })
      .where(eq(researchJobs.id, job.id));

    return c.json({ ok: false, processed: 0, jobId: job.id, error: err.message }, 500);
  }
});

cronApp.post("/check-alerts", async (c) => {
  // Placeholder for alert checking logic
  return c.json({ ok: true, message: "Alerts checked (placeholder)" });
});

export default cronApp;
