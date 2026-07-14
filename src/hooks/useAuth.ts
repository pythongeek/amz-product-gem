import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { getSupabase } from "@/lib/supabase";
import { getAdminToken, removeAdminToken, setAdminToken } from "@/lib/admin-auth";
import { trpc } from "@/providers/trpc";
import type { User } from "@db/schema";

export function useAuth(options?: { redirectOnUnauthenticated?: boolean }) {
  const { redirectOnUnauthenticated = false } = options ?? {};
  const navigate = useNavigate();
  const utils = trpc.useUtils();

  const [isLoading, setIsLoading] = useState(true);
  const [supabaseUser, setSupabaseUser] = useState<User | null>(null);
  const [adminUser, setAdminUser] = useState<{
    id: number;
    username: string;
    name: string | null;
    role: "admin";
  } | null>(null);

  // Regular user query
  const {
    data: serverUser,
    isLoading: serverLoading,
    error: userError,
  } = trpc.auth.me.useQuery(undefined, {
    staleTime: 1000 * 60 * 5,
    retry: false,
    enabled: !!localStorage.getItem("supabase_access_token") && !getAdminToken(),
  });

  // Admin query
  const {
    data: adminData,
    isLoading: adminLoading,
    error: adminError,
  } = trpc.admin.me.useQuery(undefined, {
    staleTime: 1000 * 60 * 5,
    retry: false,
    enabled: !!getAdminToken(),
  });

  // Admin login mutation
  const adminLoginMutation = trpc.admin.login.useMutation({
    onSuccess: (data) => {
      setAdminToken(data.token);
      setAdminUser({ ...data.admin, role: "admin" });
      utils.invalidate();
    },
  });

  useEffect(() => {
    const checkSession = async () => {
      if (getAdminToken()) {
        setIsLoading(false);
        return;
      }
      const { data: { session } } = await getSupabase().auth.getSession();
      if (session?.access_token) {
        localStorage.setItem("supabase_access_token", session.access_token);
      }
      setIsLoading(false);
    };
    checkSession();
  }, []);

  useEffect(() => {
    const { data: { subscription } } = getSupabase().auth.onAuthStateChange(
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
    if (adminData) {
      setAdminUser(adminData);
    }
  }, [adminData]);

  const isAdmin = !!adminUser;
  const isAuthenticated = !!supabaseUser || isAdmin;
  const currentUser = adminUser || supabaseUser;

  useEffect(() => {
    if (
      redirectOnUnauthenticated &&
      !isLoading &&
      !serverLoading &&
      !adminLoading &&
      !isAuthenticated
    ) {
      navigate("/login");
    }
  }, [
    redirectOnUnauthenticated,
    isLoading,
    serverLoading,
    adminLoading,
    isAuthenticated,
    navigate,
  ]);

  const logout = useCallback(async () => {
    if (isAdmin) {
      removeAdminToken();
      setAdminUser(null);
    } else {
      await getSupabase().auth.signOut();
      localStorage.removeItem("supabase_access_token");
    }
    await utils.invalidate();
    navigate("/login");
  }, [utils, navigate, isAdmin]);

  const loginWithGitHub = useCallback(async () => {
    const { error } = await getSupabase().auth.signInWithOAuth({
      provider: "github",
      options: {
        redirectTo: `${window.location.origin}/dashboard`,
      },
    });
    if (error) console.error("GitHub login error:", error);
  }, []);

  const loginWithGoogle = useCallback(async () => {
    const { error } = await getSupabase().auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/dashboard`,
      },
    });
    if (error) console.error("Google login error:", error);
  }, []);

  const loginAsAdmin = useCallback(
    async (username: string, password: string) => {
      const result = await adminLoginMutation.mutateAsync({
        username,
        password,
      });
      return result;
    },
    [adminLoginMutation]
  );

  return useMemo(
    () => ({
      user: currentUser,
      isAuthenticated,
      isAdmin,
      isLoading: isLoading || serverLoading || adminLoading,
      error: userError || adminError,
      logout,
      loginWithGitHub,
      loginWithGoogle,
      loginAsAdmin,
      refresh: () => utils.invalidate(),
    }),
    [
      currentUser,
      isAuthenticated,
      isAdmin,
      isLoading,
      serverLoading,
      adminLoading,
      userError,
      adminError,
      logout,
      loginWithGitHub,
      loginWithGoogle,
      loginAsAdmin,
      utils,
    ]
  );
}
