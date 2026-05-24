"use client";

import { supabase } from "@/lib/supabase";
import { getAuthCallbackUrl } from "@/lib/site";
import type { Session, User } from "@supabase/supabase-js";
import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from "react";

type AuthContextValue = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  siteOrigin: string;
  signInWithGoogle: (redirectTo?: string) => Promise<{ error?: string }>;
  signInWithPassword: (email: string, password: string) => Promise<{ error?: string; userId?: string }>;
  signUpWithPassword: (input: {
    email: string;
    password: string;
    name?: string;
    redirectTo?: string;
  }) => Promise<{ error?: string }>;
  signOut: () => Promise<{ error?: string }>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children, siteOrigin = "" }: { children: ReactNode; siteOrigin?: string }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user: session?.user ?? null,
      session,
      loading,
      siteOrigin,
      signInWithGoogle: async (redirectTo = getAuthCallbackUrl("/onboarding", siteOrigin)) => {
        const { error } = await supabase.auth.signInWithOAuth({
          provider: "google",
          options: { redirectTo },
        });
        return error ? { error: error.message } : {};
      },
      signInWithPassword: async (email, password) => {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        return error ? { error: error.message } : { userId: data.user?.id };
      },
      signUpWithPassword: async ({ email, password, name, redirectTo = getAuthCallbackUrl("/onboarding", siteOrigin) }) => {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: name },
            emailRedirectTo: redirectTo,
          },
        });
        return error ? { error: error.message } : {};
      },
      signOut: async () => {
        const { error } = await supabase.auth.signOut();
        return error ? { error: error.message } : {};
      },
    }),
    [loading, session, siteOrigin],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return context;
}
