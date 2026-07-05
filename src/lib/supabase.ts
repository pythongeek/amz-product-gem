import { createClient, SupabaseClient } from "@supabase/supabase-js";

let _client: SupabaseClient | null = null;

function getSupabaseUrl(): string {
  const url = import.meta.env.VITE_SUPABASE_URL || "";
  if (!url) {
    throw new Error(
      "VITE_SUPABASE_URL is required. Please set it in your Vercel environment variables."
    );
  }
  return url;
}

function getSupabaseKey(): string {
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY || "";
  if (!key) {
    throw new Error(
      "VITE_SUPABASE_ANON_KEY is required. Please set it in your Vercel environment variables."
    );
  }
  return key;
}

export function getSupabase(): SupabaseClient {
  if (!_client) {
    _client = createClient(getSupabaseUrl(), getSupabaseKey(), {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    });

    _client.auth.onAuthStateChange((_event, session) => {
      if (session?.access_token) {
        localStorage.setItem("supabase_access_token", session.access_token);
      } else {
        localStorage.removeItem("supabase_access_token");
      }
    });
  }
  return _client;
}
