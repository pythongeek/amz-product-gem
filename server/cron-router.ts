import { Hono } from "hono";
import { z } from "zod";
import { env } from "./lib/env";
import { getDb } from "./queries/connection";
import {
  researchJobs,
  reports,
  products,
  productScores,
  alerts,
  productSnapshots,
  keywordSearches,
  keywordSearchListings,
} from "@db/schema";
import { eq, and, desc, or, isNull, isNotNull } from "drizzle-orm";
import {
  callAIWithFallback,
  buildGroundedSystemPrompt,
  BANGLA_SYSTEM_PROMPT,
} from "./lib/ai";
import { TRPCError } from "@trpc/server";
import { extractSpecsFromReport } from "./lib/scoring";
import {
  fetchListingsForKeyword,
  fetchAmazonProduct,
} from "./lib/amazon-paapi";
import {
  assessMarket,
  scoreListing,
  mapToKeywordSearchListing,
} from "./lib/listing-analysis";
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
      return c.json(
        { error: "Unauthorized — invalid or missing x-cron-secret" },
        401
      );
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

cronApp.post("/process-keyword-search", async c => {
  const db = getDb();

  // Pick one pending OR partially processed keyword search (FIFO)
  const jobs = await db
    .select()
    .from(keywordSearches)
    .where(
      or(
        eq(keywordSearches.status, "pending"),
        and(
          eq(keywordSearches.status, "running"),
          isNotNull(keywordSearches.aggregateScores),
          isNull(keywordSearches.summaryReport)
        )
      )
    )
    .orderBy(keywordSearches.createdAt)
    .limit(1);

  if (jobs.length === 0) {
    return c.json({
      ok: true,
      processed: 0,
      message: "No pending or partially processed keyword searches",
    });
  }

  const search = jobs[0];

  try {
    const { keyword, marketplace } = search;

    // --- PHASE 1: Scrape & Insert (if status is pending) ---
    if (search.status === "pending") {
      // Mark as running
      await db
        .update(keywordSearches)
        .set({ status: "running", startedAt: new Date() })
        .where(eq(keywordSearches.id, search.id));

      // Fetch listings from Amazon PA-API
      const result = await fetchListingsForKeyword(
        keyword,
        marketplace || "US"
      );

      // Calculate market assessment
      const marketAssessment = assessMarket(
        result.items,
        result.totalResultCount
      );

      // Calculate top brand
      const brands = result.items.map(l => l.brand).filter(b => b);
      const brandCounts: Record<string, number> = {};
      brands.forEach(brand => {
        if (brand) brandCounts[brand] = (brandCounts[brand] || 0) + 1;
      });
      const topBrand =
        Object.entries(brandCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "";

      // Score each listing and map to database structure
      const listingsToInsert = result.items.map((item, index) => {
        const scoreResult = scoreListing(item, {
          medianReviews: marketAssessment.avgReviewCount,
          medianPrice: marketAssessment.avgPrice,
          topBrand: topBrand,
        });
        return mapToKeywordSearchListing(
          item,
          search.id,
          index + 1,
          scoreResult.score,
          scoreResult.verdict,
          scoreResult.reason
        );
      });

      // Insert scored listings into database
      if (listingsToInsert.length > 0) {
        await db.insert(keywordSearchListings).values(listingsToInsert);
      }

      // Save aggregate scores and keep status as 'running' so Phase 2 picks it up next time
      await db
        .update(keywordSearches)
        .set({
          totalResultCount: result.totalResultCount,
          aggregateScores: marketAssessment as any,
        })
        .where(eq(keywordSearches.id, search.id));

      return c.json({
        ok: true,
        processed: 1,
        phase: 1,
        searchId: search.id,
        totalListings: result.items.length,
      });
    }

    // --- PHASE 2: AI Summary (if status is running and scores exist) ---
    if (search.status === "running" && search.aggregateScores) {
      const marketAssessment: any = search.aggregateScores;
      const systemPrompt = await buildGroundedSystemPrompt(marketplace || "US");

      const userPrompt = `## কীওয়ার্ড: "${keyword}"
## মার্কেটপ্লেস: ${marketplace}
## মোট ফলাফল: ${search.totalResultCount}

### মার্কেট ওভারভিউ:
- গড় প্রাইস: $${marketAssessment.avgPrice?.toFixed(2)}
- গড় রিভিউ: ${marketAssessment.avgReviewCount?.toFixed(0)}
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
          summaryReport: aiResult,
          completedAt: new Date(),
        })
        .where(eq(keywordSearches.id, search.id));

      return c.json({ ok: true, processed: 1, phase: 2, searchId: search.id });
    }

    return c.json({
      ok: true,
      processed: 0,
      message: "No valid phase to process",
    });
  } catch (err: any) {
    // Mark search as failed
    await db
      .update(keywordSearches)
      .set({ status: "failed", error: err.message })
      .where(eq(keywordSearches.id, search.id));

    return c.json(
      { ok: false, processed: 0, searchId: search.id, error: err.message },
      500
    );
  }
});

// ── 3. Process Pending Research Jobs ──────────────────────────────
// Called every 5 minutes by cron-jobs.org.
cronApp.post("/process-research", async c => {
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

    if (job.inputType === "manual") {
      throw new Error(
        "Manual research is disabled. Submit an Amazon product URL or keyword so the report uses live Amazon data."
      );
    }

    if (job.inputType === "url") {
      // Extract ASIN from URL
      const match = job.input.match(/\/(?:dp|gp\/product)\/([A-Z0-9]{10})/);
      const asin = match ? match[1] : job.input;

      const product = await fetchAmazonProduct(asin, job.marketplace || "US");

      prompt = `Analyze this Amazon product using only the live Amazon data below.
ASIN: ${product.asin}
Title: ${product.title}
Price: ${product.price}
Rating: ${product.rating} stars (${product.reviewCount} reviews)
BSR: ${product.bsr ?? "not returned by the live source"}
Category: ${product.bsrCategory ?? "not returned by the live source"}
Seller count: ${product.sellerCount ?? "not returned by the live source"}

Write the report in Bangla. Do not estimate sales velocity, margin, demand, BSR, fees, weight, dimensions, or seller information. For each unavailable metric write “লাইভ সোর্সে পাওয়া যায়নি”, explain its impact, and make the final recommendation conditional where needed.`;
      finalScores = {};
    } else {
      const keyword = job.input;
      const result = await fetchListingsForKeyword(
        keyword,
        job.marketplace || "US"
      );
      const marketAssessment = assessMarket(
        result.items,
        result.totalResultCount
      );

      prompt = `Conduct Amazon FBA research on the keyword: "${keyword}".
Market Overview from the live result set:
- Average Price: $${marketAssessment.avgPrice.toFixed(2)}
- Average Reviews: ${marketAssessment.avgReviewCount.toFixed(0)}
- Top Brand Share: ${(marketAssessment.topBrandShare * 100).toFixed(1)}%
- Total Results: ${result.totalResultCount}
- Listings Analysed: ${result.items.length}

Write the report in Bangla based exclusively on this observed aggregate data. Do not invent search volume, sales velocity, margin, seasonality, fees, or demand history. State “লাইভ সোর্সে পাওয়া যায়নি” for unavailable information and make any recommendation conditional on those gaps.`;
      finalScores = {};
    }

    const result = await callAIWithFallback([
      {
        role: "system",
        content: await buildGroundedSystemPrompt(job.marketplace || "US"),
      },
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

    return c.json(
      { ok: false, processed: 0, jobId: job.id, error: err.message },
      500
    );
  }
});

cronApp.post("/check-alerts", async c => {
  const db = getDb();
  const tracked = await db
    .select()
    .from(products)
    .orderBy(products.updatedAt)
    .limit(25);
  let checked = 0;
  let alertsCreated = 0;

  for (const product of tracked) {
    try {
      const live = await fetchAmazonProduct(
        product.asin,
        product.marketplace || "US"
      );
      if (!live.title || live.price <= 0) continue;

      const [previous] = await db
        .select()
        .from(productSnapshots)
        .where(eq(productSnapshots.productId, product.id))
        .orderBy(desc(productSnapshots.capturedAt))
        .limit(1);
      const changes: Array<{
        type: "price_drop" | "bsr_change" | "new_review";
        oldValue: string;
        newValue: string;
        message: string;
      }> = [];
      const oldPrice = previous?.price ? Number(previous.price) : null;
      if (oldPrice !== null && live.price < oldPrice)
        changes.push({
          type: "price_drop",
          oldValue: String(oldPrice),
          newValue: String(live.price),
          message: "Live Amazon price decreased",
        });
      if (
        previous?.bsr !== null &&
        previous?.bsr !== undefined &&
        live.bsr !== undefined &&
        live.bsr !== previous.bsr
      )
        changes.push({
          type: "bsr_change",
          oldValue: String(previous.bsr),
          newValue: String(live.bsr),
          message: "Live Amazon BSR changed",
        });
      if (
        previous?.reviewCount !== null &&
        previous?.reviewCount !== undefined &&
        live.reviewCount > previous.reviewCount
      )
        changes.push({
          type: "new_review",
          oldValue: String(previous.reviewCount),
          newValue: String(live.reviewCount),
          message: "Live Amazon review count increased",
        });

      await db
        .update(products)
        .set({
          title: live.title,
          price: String(live.price),
          rating: live.rating ? String(live.rating) : null,
          reviewCount: live.reviewCount || null,
          bsr: live.bsr ?? null,
          bsrCategory: live.bsrCategory ?? null,
          imageUrl: live.imageUrl || null,
          updatedAt: new Date(),
        })
        .where(eq(products.id, product.id));
      await db
        .insert(productSnapshots)
        .values({
          productId: product.id,
          price: String(live.price),
          bsr: live.bsr ?? null,
          reviewCount: live.reviewCount || null,
        });
      if (changes.length) {
        await db
          .insert(alerts)
          .values(
            changes.map(change => ({
              productId: product.id,
              userId: product.userId,
              alertType: change.type,
              oldValue: change.oldValue,
              newValue: change.newValue,
              message: change.message,
            }))
          );
        alertsCreated += changes.length;
      }
      checked++;
    } catch (error) {
      console.warn("[check-alerts] Live refresh failed", error);
    }
  }

  return c.json({ ok: true, checked, alertsCreated });
});

export default cronApp;
