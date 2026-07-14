import { eq } from "drizzle-orm";
import * as schema from "@db/schema";
import type { InsertUser } from "@db/schema";
import { getDb } from "./connection";
import { env } from "../lib/env";

export async function findUserBySupabaseUid(supabaseUid: string) {
  const rows = await getDb()
    .select()
    .from(schema.users)
    .where(eq(schema.users.supabaseUid, supabaseUid))
    .limit(1);
  return rows.at(0);
}

// Kept for template compatibility - not used with Supabase Auth
export async function findUserByUnionId(_unionId: string) {
  return null;
}

// Kept for template compatibility - not used with Supabase Auth
export async function upsertUser(data: Partial<InsertUser>) {
  const db = getDb();
  const values = { ...data };

  if (
    values.role === undefined &&
    values.supabaseUid &&
    values.supabaseUid === env.ownerUnionId
  ) {
    values.role = "admin";
  }

  await db.insert(schema.users).values(values as InsertUser).onConflictDoNothing();
}
