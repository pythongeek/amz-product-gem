import { z } from "zod";
import { createRouter, authedQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { researchJobs } from "@db/schema";
import { eq, desc } from "drizzle-orm";

export const jobRouter = createRouter({
  // ── Submit Research Job (Queue-based, returns immediately) ──
  submitResearch: authedQuery
    .input(
      z.object({
        input: z.string().min(1, "Input is required"),
        inputType: z.enum(["url", "keyword"]).default("keyword"),
        marketplace: z.string().default("US"),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = getDb();

      const [job] = await db
        .insert(researchJobs)
        .values({
          userId: ctx.user.id,
          input: input.input,
          inputType: input.inputType,
          marketplace: input.marketplace,
          status: "pending",
        })
        .returning();

      return {
        success: true,
        jobId: job.id,
        message: "Research job queued. It will be processed shortly.",
      };
    }),

  // ── Get Job Status (for polling) ──
  getJobStatus: authedQuery
    .input(z.object({ jobId: z.number() }))
    .query(async ({ input, ctx }) => {
      const db = getDb();
      const rows = await db
        .select()
        .from(researchJobs)
        .where(eq(researchJobs.id, input.jobId))
        .limit(1);

      const job = rows[0];
      if (!job) throw new Error("Job not found");
      if (job.userId !== ctx.user.id && ctx.user.role !== "admin") {
        throw new Error("Unauthorized");
      }

      return {
        id: job.id,
        status: job.status,
        input: job.input,
        inputType: job.inputType,
        result: job.result,
        scores: job.scores,
        error: job.error,
        createdAt: job.createdAt,
        completedAt: job.completedAt,
      };
    }),

  // ── List User's Jobs ──
  listJobs: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    return db
      .select()
      .from(researchJobs)
      .where(eq(researchJobs.userId, ctx.user.id))
      .orderBy(desc(researchJobs.createdAt))
      .limit(50);
  }),

  // ── Legacy: Immediate Research (kept for backward compat, but queues now) ──
  triggerResearch: authedQuery
    .input(
      z.object({
        input: z.string(),
        userId: z.number(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Redirect to queue-based system
      const db = getDb();
      const [job] = await db
        .insert(researchJobs)
        .values({
          userId: ctx.user.id,
          input: input.input,
          inputType: "keyword",
          status: "pending",
        })
        .returning();

      return {
        success: true,
        jobId: job.id,
        message: "Research queued. Check status with job.getJobStatus",
      };
    }),

  // ── Legacy: Background Analysis (kept for backward compat) ──
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
      const db = getDb();
      const [job] = await db
        .insert(researchJobs)
        .values({
          userId: ctx.user.id,
          input: input.title,
          inputType: "keyword",
          status: "pending",
        })
        .returning();

      return { success: true, jobId: job.id };
    }),
});
