import { createClient, SupabaseClient } from "@supabase/supabase-js";

let _client: SupabaseClient | null = null;

function getEnv(key: string, fallback?: string): string {
  // Vite exposes vars prefixed with VITE_ to the browser
  const value = import.meta.env[key];
  if (value) return value;
  if (fallback && import.meta.env[fallback]) return import.meta.env[fallback];
  return "";
}

function getSupabaseUrl(): string {
  const url = getEnv("VITE_PUBLIC_SUPABASE_URL", "VITE_SUPABASE_URL");
  if (!url) {
    throw new Error(
      "VITE_PUBLIC_SUPABASE_URL (or VITE_SUPABASE_URL) is required. " +
        "Please set it in your Vercel environment variables."
    );
  }
  return url;
}

function getSupabaseKey(): string {
  const key = getEnv("VITE_PUBLIC_SUPABASE_ANON_KEY") || 
              getEnv("VITE_SUPABASE_ANON_KEY") || 
              getEnv("VITE_PUBLIC_SUPABASE_PUBLISHABLE_KEY") || 
              getEnv("SUPABASE_PUBLISHABLE_KEY");
  if (!key) {
    throw new Error(
      "VITE_PUBLIC_SUPABASE_ANON_KEY (or VITE_PUBLIC_SUPABASE_PUBLISHABLE_KEY) is required. " +
        "Please set it in your Vercel environment variables."
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
