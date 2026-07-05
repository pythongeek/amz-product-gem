import type { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";
import type { User } from "@db/schema";
import { getDb } from "./queries/connection";
import { users } from "@db/schema";
import { eq } from "drizzle-orm";
import { supabaseAdmin } from "./lib/supabase";

export type TrpcContext = {
  req: Request;
  resHeaders: Headers;
  user?: User;
};

export async function createContext(
  opts: FetchCreateContextFnOptions,
): Promise<TrpcContext> {
  const ctx: TrpcContext = { req: opts.req, resHeaders: opts.resHeaders };

  try {
    // Get auth token from Authorization header
    const authHeader = opts.req.headers.get("authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.substring(7);

      // Verify token with Supabase
      const { data: { user: supabaseUser }, error } = await supabaseAdmin.auth.getUser(token);

      if (supabaseUser && !error) {
        // Find or create user in our database
        const db = getDb();
        const existingUsers = await db
          .select()
          .from(users)
          .where(eq(users.supabaseUid, supabaseUser.id))
          .limit(1);

        if (existingUsers.length > 0) {
          ctx.user = existingUsers[0];
        } else {
          // Create new user
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
    }
  } catch {
    // Authentication is optional here
  }

  return ctx;
}
