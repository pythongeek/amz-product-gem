import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { supabase } from "@/lib/supabase";
import { trpc } from "@/providers/trpc";
import type { User } from "@db/schema";

export function useAuth(options?: { redirectOnUnauthenticated?: boolean }) {
  const { redirectOnUnauthenticated = false } = options ?? {};
  const navigate = useNavigate();
  const utils = trpc.useUtils();

  const [isLoading, setIsLoading] = useState(true);
  const [supabaseUser, setSupabaseUser] = useState<User | null>(null);

  const {
    data: serverUser,
    isLoading: serverLoading,
    error,
  } = trpc.auth.me.useQuery(undefined, {
    staleTime: 1000 * 60 * 5,
    retry: false,
    enabled: !!localStorage.getItem("supabase_access_token"),
  });

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        localStorage.setItem("supabase_access_token", session.access_token);
      }
      setIsLoading(false);
    };
    checkSession();
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session?.access_token) {
          localStorage.setItem("supabase_access_token", session.access_token);
          utils.auth.me.invalidate();
        } else {
          localStorage.removeItem("supabase_access_token");
          setSupabaseUser(null);
        }
      }
    );
    return () => subscription.unsubscribe();
  }, [utils]);

  useEffect(() => {
    if (serverUser) {
      setSupabaseUser(serverUser as User);
    }
  }, [serverUser]);

  useEffect(() => {
    if (redirectOnUnauthenticated && !isLoading && !serverLoading && !serverUser) {
      navigate("/login");
    }
  }, [redirectOnUnauthenticated, isLoading, serverLoading, serverUser, navigate]);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    localStorage.removeItem("supabase_access_token");
    await utils.invalidate();
    navigate("/login");
  }, [utils, navigate]);

  const loginWithGitHub = useCallback(async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "github",
      options: {
        redirectTo: `${window.location.origin}/dashboard`,
      },
    });
    if (error) console.error("GitHub login error:", error);
  }, []);

  const loginWithGoogle = useCallback(async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/dashboard`,
      },
    });
    if (error) console.error("Google login error:", error);
  }, []);

  return useMemo(
    () => ({
      user: supabaseUser,
      isAuthenticated: !!supabaseUser,
      isLoading: isLoading || serverLoading,
      error,
      logout,
      loginWithGitHub,
      loginWithGoogle,
      refresh: () => utils.auth.me.invalidate(),
    }),
    [supabaseUser, isLoading, serverLoading, error, logout, loginWithGitHub, loginWithGoogle, utils]
  );
}
