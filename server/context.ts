import type { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";
import type { User } from "@db/schema";
import { getDb } from "./queries/connection";
import { users } from "@db/schema";
import { eq } from "drizzle-orm";
import { supabaseAdmin } from "./lib/supabase";
import { verifyAdminToken, type AdminTokenPayload } from "./lib/admin-auth";

export type TrpcContext = {
  req: Request;
  resHeaders: Headers;
  user?: User;
  admin?: AdminTokenPayload;
};

export async function createContext(
  opts: FetchCreateContextFnOptions,
): Promise<TrpcContext> {
  const ctx: TrpcContext = { req: opts.req, resHeaders: opts.resHeaders };

  try {
    const authHeader = opts.req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return ctx;
    }

    const token = authHeader.substring(7);

    // Try admin token first
    const adminPayload = await verifyAdminToken(token);
    if (adminPayload) {
      ctx.admin = adminPayload;
      // Create a synthetic User object so adminQuery middleware works
      ctx.user = {
        id: -adminPayload.adminId, // negative to avoid collision with real users
        supabaseUid: `admin:${adminPayload.adminId}`,
        email: adminPayload.username,
        name: adminPayload.username,
        avatar: null,
        role: "admin",
        experienceLevel: null,
        budgetRange: null,
        preferredSourcing: null,
        targetMargin: null,
        localArea: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as User;
      return ctx;
    }

    // Try Supabase OAuth token
    const { data: { user: supabaseUser }, error } = await supabaseAdmin.auth.getUser(token);

    if (supabaseUser && !error) {
      const db = getDb();
      const existingUsers = await db
        .select()
        .from(users)
        .where(eq(users.supabaseUid, supabaseUser.id))
        .limit(1);

      if (existingUsers.length > 0) {
        ctx.user = existingUsers[0];
      } else {
        const newUser = await db
          .insert(users)
          .values({
            supabaseUid: supabaseUser.id,
            email: supabaseUser.email,
            name: supabaseUser.user_metadata?.name || supabaseUser.email?.split("@")[0],
            avatar: supabaseUser.user_metadata?.avatar_url,
          })
          .returning();

        if (newUser.length > 0) {
          ctx.user = newUser[0];
        }
      }
    }
  } catch {
    // Authentication is optional
  }

  return ctx;
}
