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
      const db = getDb();
      const adminSupabaseUid = `admin:${adminPayload.adminId}`;
      
      // Look up or create admin user in users table (needed for FK constraints)
      const existingAdminUsers = await db
        .select()
        .from(users)
        .where(eq(users.supabaseUid, adminSupabaseUid))
        .limit(1);

      if (existingAdminUsers.length > 0) {
        ctx.user = existingAdminUsers[0];
      } else {
        // Create admin user in users table so FK constraints work
        const newAdminUser = await db
          .insert(users)
          .values({
            supabaseUid: adminSupabaseUid,
            email: adminPayload.username,
            name: adminPayload.username,
            role: "admin",
          })
          .returning();
        
        if (newAdminUser.length > 0) {
          ctx.user = newAdminUser[0];
        }
      }
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
