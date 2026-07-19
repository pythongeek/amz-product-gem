import { z } from "zod";
import { createRouter, authedQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { keywordSearches, keywordSearchListings } from "@db/schema";
import { eq } from "drizzle-orm";
import { parseAmazonSearchInput } from "@/lib/amazon-url";

export const keywordResearchRouter = createRouter({
  // ── Analyze Keyword (queue-based to bypass 8s timeout) ──
  analyze: authedQuery
    .input(
      z.object({ input: z.string().min(1), marketplace: z.string().optional() })
    )
    .mutation(async ({ input, ctx }) => {
      const db = getDb();

      const { keyword, marketplace: detected } = parseAmazonSearchInput(
        input.input
      );
      const marketplace = input.marketplace || detected;

      // Queue the job instead of doing it inline
      const [search] = await db
        .insert(keywordSearches)
        .values({
          userId: ctx.user.id,
          rawInput: input.input,
          keyword,
          marketplace,
          status: "pending",
        })
        .returning();

      return { searchId: search.id };
    }),

  // ── Get Keyword Search Status ──
  getStatus: authedQuery
    .input(z.object({ searchId: z.number() }))
    .query(async ({ input, ctx }) => {
      const db = getDb();
      const [search] = await db
        .select()
        .from(keywordSearches)
        .where(eq(keywordSearches.id, input.searchId))
        .limit(1);

      if (!search) {
        throw new Error("Search not found");
      }

      if (search.userId !== ctx.user.id && ctx.user.role !== "admin") {
        throw new Error("Unauthorized");
      }

      const listings = await db
        .select()
        .from(keywordSearchListings)
        .where(eq(keywordSearchListings.searchId, input.searchId))
        .orderBy(keywordSearchListings.position);

      return { ...search, listings };
    }),

  // ── Legacy compatibility: Get Job Status (wraps existing researchJobs) ──
  getJobStatus: authedQuery
    .input(z.object({ jobId: z.number() }))
    .query(async ({ input, ctx }) => {
      const db = getDb();

      // Check if it's a keyword research job
      const [job] = await db
        .select()
        .from(keywordSearches)
        .where(eq(keywordSearches.id, input.jobId))
        .limit(1);

      if (job) {
        const listings = await db
          .select()
          .from(keywordSearchListings)
          .where(eq(keywordSearchListings.searchId, input.jobId))
          .orderBy(keywordSearchListings.position);
        return { ...job, listings };
      }

      // Fallback to existing researchJobs for backward compatibility
      const { researchJobs } = await import("@db/schema");
      const [legacyJob] = await db
        .select()
        .from(researchJobs)
        .where(eq(researchJobs.id, input.jobId))
        .limit(1);

      if (!legacyJob) {
        throw new Error("Job not found");
      }

      if (legacyJob.userId !== ctx.user.id && ctx.user.role !== "admin") {
        throw new Error("Unauthorized");
      }

      return legacyJob;
    }),
});
