import { z } from "zod";
import { createRouter, publicQuery, adminQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { adminCredentials, kbFeeRates } from "@db/schema";
import { eq, desc } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { signAdminToken, verifyAdminToken } from "./lib/admin-auth";
import { TRPCError } from "@trpc/server";
import { clearKbCache } from "./queries/knowledge-base";
import { env } from "./lib/env";

export const adminAuthRouter = createRouter({
  login: publicQuery
    .input(
      z.object({
        username: z.string().min(1, "Username is required"),
        password: z.string().min(1, "Password is required"),
      }),
    )
    .mutation(async ({ input }) => {
      try {
        const db = getDb();
        const rows = await db
          .select()
          .from(adminCredentials)
          .where(eq(adminCredentials.username, input.username))
          .limit(1);

        const admin = rows.at(0);
        if (!admin || !admin.isActive) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Invalid username or password",
          });
        }

        const valid = await bcrypt.compare(input.password, admin.passwordHash);
        if (!valid) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Invalid username or password",
          });
        }

        const token = await signAdminToken({
          adminId: admin.id,
          username: admin.username,
          role: "admin",
        });

        return {
          token,
          admin: {
            id: admin.id,
            username: admin.username,
            name: admin.name,
          },
        };
      } catch (err: any) {
        if (err instanceof TRPCError) throw err;
        console.error("[admin.login] DB error:", err.message, err.code, err.stack);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `DB error: ${err.message || "Unknown"}`,
        });
      }
    }),

  me: publicQuery.query(async ({ ctx }) => {
    const authHeader = ctx.req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return null;
    }

    const token = authHeader.substring(7);
    const payload = await verifyAdminToken(token);
    if (!payload) return null;

    const db = getDb();
    const rows = await db
      .select()
      .from(adminCredentials)
      .where(eq(adminCredentials.id, payload.adminId))
      .limit(1);

    const admin = rows.at(0);
    if (!admin || !admin.isActive) return null;

    return {
      id: admin.id,
      username: admin.username,
      name: admin.name,
      role: "admin" as const,
    };
  }),

  // Seed endpoint — creates or resets the default admin (public, idempotent)
  ensureDefaultAdmin: publicQuery.mutation(async () => {
    const db = getDb();
    let adminPassword = process.env.ADMIN_PASSWORD;

    if (env.isProduction) {
      if (!adminPassword || adminPassword === "admin123") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "CRITICAL SECURITY ERROR: ADMIN_PASSWORD environment variable must be set to a secure value in production to seed the admin account!",
        });
      }
    } else {
      adminPassword = adminPassword || "admin123";
    }

    const hash = await bcrypt.hash(adminPassword, 12);

    const existing = await db
      .select()
      .from(adminCredentials)
      .where(eq(adminCredentials.username, "admin"))
      .limit(1);

    if (existing.length > 0) {
      // Reset password to the configured/new hash
      await db
        .update(adminCredentials)
        .set({ passwordHash: hash, isActive: true })
        .where(eq(adminCredentials.username, "admin"));
      return { created: false, reset: true, message: "Default admin password updated successfully." };
    }

    await db.insert(adminCredentials).values({
      username: "admin",
      passwordHash: hash,
      name: "System Administrator",
      isActive: true,
    });

    return { created: true, message: "Default admin created successfully." };
  }),

  listRates: adminQuery.query(async () => {
    const db = getDb();
    return db.select().from(kbFeeRates).orderBy(desc(kbFeeRates.effectiveDate));
  }),

  updateRate: adminQuery
    .input(
      z.object({
        id: z.number(),
        marketplace: z.string().min(1),
        feeType: z.string().min(1),
        category: z.string().nullable().optional(),
        sizeTier: z.string().nullable().optional(),
        weightMinOz: z.number().nullable().optional(),
        weightMaxOz: z.number().nullable().optional(),
        priceMin: z.number().nullable().optional(),
        priceMax: z.number().nullable().optional(),
        rateType: z.enum(["percent", "flat"]),
        rateValue: z.number(),
        currency: z.string().default("USD"),
        notes: z.string().nullable().optional(),
        effectiveDate: z.string().min(1),
        source: z.string().nullable().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      const { id, ...data } = input;
      
      const updated = await db
        .update(kbFeeRates)
        .set({
          ...data,
          weightMinOz: data.weightMinOz !== undefined && data.weightMinOz !== null ? String(data.weightMinOz) : null,
          weightMaxOz: data.weightMaxOz !== undefined && data.weightMaxOz !== null ? String(data.weightMaxOz) : null,
          priceMin: data.priceMin !== undefined && data.priceMin !== null ? String(data.priceMin) : null,
          priceMax: data.priceMax !== undefined && data.priceMax !== null ? String(data.priceMax) : null,
          rateValue: String(data.rateValue),
          effectiveDate: data.effectiveDate,
        })
        .where(eq(kbFeeRates.id, id))
        .returning();

      clearKbCache();
      return updated[0];
    }),

  insertRate: adminQuery
    .input(
      z.object({
        marketplace: z.string().min(1),
        feeType: z.string().min(1),
        category: z.string().nullable().optional(),
        sizeTier: z.string().nullable().optional(),
        weightMinOz: z.number().nullable().optional(),
        weightMaxOz: z.number().nullable().optional(),
        priceMin: z.number().nullable().optional(),
        priceMax: z.number().nullable().optional(),
        rateType: z.enum(["percent", "flat"]),
        rateValue: z.number(),
        currency: z.string().default("USD"),
        notes: z.string().nullable().optional(),
        effectiveDate: z.string().min(1),
        source: z.string().nullable().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      const inserted = await db
        .insert(kbFeeRates)
        .values({
          ...input,
          weightMinOz: input.weightMinOz !== undefined && input.weightMinOz !== null ? String(input.weightMinOz) : null,
          weightMaxOz: input.weightMaxOz !== undefined && input.weightMaxOz !== null ? String(input.weightMaxOz) : null,
          priceMin: input.priceMin !== undefined && input.priceMin !== null ? String(input.priceMin) : null,
          priceMax: input.priceMax !== undefined && input.priceMax !== null ? String(input.priceMax) : null,
          rateValue: String(input.rateValue),
          effectiveDate: input.effectiveDate,
        })
        .returning();

      clearKbCache();
      return inserted[0];
    }),

  deleteRate: adminQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db.delete(kbFeeRates).where(eq(kbFeeRates.id, input.id));
      clearKbCache();
      return { success: true };
    }),
});
