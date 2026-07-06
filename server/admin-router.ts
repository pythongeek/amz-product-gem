import { z } from "zod";
import { createRouter, publicQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { adminCredentials } from "@db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { signAdminToken, verifyAdminToken } from "./lib/admin-auth";
import { TRPCError } from "@trpc/server";

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
    const hash = await bcrypt.hash("admin123", 12);

    const existing = await db
      .select()
      .from(adminCredentials)
      .where(eq(adminCredentials.username, "admin"))
      .limit(1);

    if (existing.length > 0) {
      // Reset password to the known hash (fixes broken dummy hashes)
      await db
        .update(adminCredentials)
        .set({ passwordHash: hash, isActive: true })
        .where(eq(adminCredentials.username, "admin"));
      return { created: false, reset: true, message: "Default admin password reset to: admin123" };
    }

    await db.insert(adminCredentials).values({
      username: "admin",
      passwordHash: hash,
      name: "System Administrator",
      isActive: true,
    });

    return { created: true, message: "Default admin created: username=admin, password=admin123" };
  }),
});
