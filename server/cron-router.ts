import { Hono } from "hono";
import { z } from "zod";
import { env } from "./lib/env";
import { getDb } from "./queries/connection";
import { researchJobs, reports, products, productScores, alerts, productSnapshots, keywordSearches, keywordSearchListings } from "@db/schema";
import { eq, and, desc } from "drizzle-orm";
import { callAIWithFallback, buildGroundedSystemPrompt, BANGLA_SYSTEM_PROMPT } from "./lib/ai";
import { TRPCError } from "@trpc/server";
import { scoreProduct, extractSpecsFromReport, ProductInput } from "./lib/scoring";
import { fetchListingsForKeyword, fetchAmazonProduct } from "./lib/amazon-paapi";
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

    // Calculate market assessment
    const marketAssessment = assessMarket(result.items, result.totalResultCount);

    // Calculate top brand
    const brands = result.items.map(l => l.brand).filter(b => b);
    const brandCounts: Record<string, number> = {};
    brands.forEach(brand => {
      brandCounts[brand] = (brandCounts[brand] || 0) + 1;
    });
    const topBrand = Object.entries(brandCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "";

    // Score each listing and map to database structure
    const listingsToInsert = result.items.map((item, index) => {
      const scoreResult = scoreListing(item, {
        medianReviews: marketAssessment.avgReviewCount,
        medianPrice: marketAssessment.avgPrice,
        topBrand: topBrand,
      });
      return mapToKeywordSearchListing(item, search.id, index + 1, scoreResult.score, scoreResult.verdict, scoreResult.reason);
    });

    // Insert scored listings into database
    await db.insert(keywordSearchListings).values(listingsToInsert);

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
    let prompt = "";
    let finalScores: any = {};

    if (job.inputType === "url") {
      // Extract ASIN from URL
      const match = job.input.match(/\/(?:dp|gp\/product)\/([A-Z0-9]{10})/);
      const asin = match ? match[1] : job.input;
      
      const product = await fetchAmazonProduct(asin, "US");
      
      prompt = `Analyze this Amazon product:
ASIN: ${product.asin}
Title: ${product.title}
Brand: ${product.brand}
Price: $${product.price}
Rating: ${product.rating} stars (${product.reviewCount} reviews)
Is Prime: ${product.isPrime ? 'Yes' : 'No'}

Provide a comprehensive Amazon FBA research report in Bangla. Include: product summary, market demand, competition analysis, pricing, sales velocity, profit potential, risks, and a final recommendation (PASS/CAUTION/FAIL).`;

      // Real scores based on product
      const productScore = scoreProduct({
        price: product.price,
        size: "standard", // Mock for now as we don't scrape size
        weight: 1, // Mock
        searchVolume: 10000,
        reviewCount: product.reviewCount,
        category: "General",
        seasonality: "Medium",
        simplicity: "High",
        trend: "Stable",
        brandDominance: product.brand === "Unknown" ? "Low" : "Medium",
        margin: 30, // Mock
        differentiation: "Medium",
        manufacturability: "Easy"
      });

      finalScores = productScore.scores;

    } else {
      const keyword = job.input;
      const result = await fetchListingsForKeyword(keyword, "US");
      const marketAssessment = assessMarket(result.items, result.totalResultCount);

      prompt = `Conduct Amazon FBA research on the keyword: "${keyword}".
Market Overview:
- Average Price: $${marketAssessment.avgPrice.toFixed(2)}
- Average Reviews: ${marketAssessment.avgReviewCount.toFixed(0)}
- Top Brand Share: ${(marketAssessment.topBrandShare * 100).toFixed(1)}%
- Total Listings Analyzed: ${result.items.length}

Provide a comprehensive report in Bangla. Include: market demand, competition level, estimated pricing, sales velocity, profit potential, risks, and a final recommendation (PASS/CAUTION/FAIL).`;

      // Estimate keyword scores based on market averages
      const marketScore = scoreProduct({
        price: marketAssessment.avgPrice,
        size: "standard",
        weight: 1,
        searchVolume: result.totalResultCount > 1000 ? 50000 : 5000,
        reviewCount: marketAssessment.avgReviewCount,
        category: "General",
        seasonality: "Medium",
        simplicity: "Medium",
        trend: "Stable",
        brandDominance: marketAssessment.topBrandShare > 0.3 ? "High" : "Low",
        margin: 30,
        differentiation: "Medium",
        manufacturability: "Medium"
      });

      finalScores = marketScore.scores;
    }

    const result = await callAIWithFallback([
      { role: "system", content: BANGLA_SYSTEM_PROMPT },
      { role: "user", content: prompt },
    ]);

    // finalScores is already calculated above

    // Mark job as completed
    await db
      .update(researchJobs)
      .set({
        status: "completed",
        result,
        scores: finalScores as any,
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
