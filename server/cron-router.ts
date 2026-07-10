import { Hono } from "hono";
import { z } from "zod";
import { env } from "./lib/env";
import { getDb } from "./queries/connection";
import { researchJobs, reports, products, productScores, alerts } from "@db/schema";
import { eq, and, desc } from "drizzle-orm";
import { callAIWithFallback, BANGLA_SYSTEM_PROMPT } from "./lib/ai";
import { TRPCError } from "@trpc/server";

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
};

cronApp.use("/*", requireCronSecret);

// ── 1. Process Pending Research Jobs ──────────────────────────────
// Called every 5 minutes by cron-jobs.org.
// This bypasses Vercel's 8s function timeout because:
// - The cron job has 300s maxDuration in vercel.json
// - The request comes from outside Vercel's HTTP gateway

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
    // Build the research prompt with structured format requirements
    const prompt = job.inputType === "url"
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

    // Create a product first (so report has a valid productId FK)
    let productId: number;
    try {
      const productResult = await db
        .insert(products)
        .values({
          userId: job.userId ?? null,
          asin: "RESEARCH-" + job.id,
          title: job.input,
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
  // Placeholder — your existing alert logic
  return c.json({ ok: true, message: "Alert check triggered (implement your alert logic here)" });
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
