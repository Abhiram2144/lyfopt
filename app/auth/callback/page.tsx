"use client";

import { Suspense, useEffect, useState } from "react";
import { Layout } from "@/components/site/Layout";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

const normalizeNextPath = (value: string | null) => {
  if (!value || !value.startsWith("/")) return "/onboarding";
  return value;
};

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [message, setMessage] = useState("Completing sign-in...");
  const [error, setError] = useState("");

  useEffect(() => {
    const finishAuth = async () => {
      const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      const nextPath = normalizeNextPath(searchParams.get("next") ?? hashParams.get("next"));
      const authError =
        searchParams.get("error_description") ??
        searchParams.get("error") ??
        hashParams.get("error_description") ??
        hashParams.get("error");

      if (authError) {
        setError(authError);
        setMessage("Sign-in failed");
        return;
      }

      const code = searchParams.get("code") ?? hashParams.get("code");

      if (code) {
        setMessage("Finalizing your session...");
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

        if (exchangeError) {
          setError(exchangeError.message);
          setMessage("Sign-in failed");
          return;
        }

        router.replace(nextPath);
        return;
      }

      const { data } = await supabase.auth.getSession();
      if (data.session) {
        router.replace(nextPath);
        return;
      }

      setError("Missing auth callback data.");
      setMessage("Sign-in failed");
    };

    void finishAuth();
  }, [router, searchParams]);

  return (
    <Layout>
      <div className="container min-h-[calc(100vh-4rem)] flex items-center justify-center py-12">
        <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-elegant">
          {!error ? <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" /> : null}
          <h1 className="mt-6 font-display text-2xl font-bold">{message}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {error
              ? "Supabase returned an error before the session could be created."
              : "Hang tight while we finish the redirect."}
          </p>
          {error ? <p className="mt-4 text-sm text-destructive">{error}</p> : null}
          {error ? (
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Button asChild variant="hero">
                <Link href="/login">Back to login</Link>
              </Button>
              <Button asChild variant="ghost">
                <Link href="/signup">Try signup</Link>
              </Button>
            </div>
          ) : null}
        </div>
      </div>
    </Layout>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={null}>
      <AuthCallbackContent />
    </Suspense>
  );
}
