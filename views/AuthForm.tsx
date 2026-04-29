"use client";

import { Layout } from "@/components/site/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/components/site/AuthProvider";
import { loadProfile, loadProfileFromDatabase } from "@/lib/onboarding";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";

interface Props {
  mode: "login" | "signup";
}

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
    <path
      fill="currentColor"
      d="M12 10.2v3.9h5.5c-.2 1.4-1.6 4.2-5.5 4.2-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.2.8 3.9 1.5l2.7-2.6C17 3.4 14.7 2.4 12 2.4 6.7 2.4 2.4 6.7 2.4 12s4.3 9.6 9.6 9.6c5.5 0 9.2-3.9 9.2-9.4 0-.6-.1-1.1-.2-1.6H12z"
    />
  </svg>
);

const AuthShell = ({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer: ReactNode;
}) => (
  <div className="relative container min-h-[calc(100vh-4rem)] flex items-center justify-center py-12">
    <div className="absolute inset-0 bg-hero-glow pointer-events-none" />
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="relative w-full max-w-md"
    >
      <div className="glass rounded-2xl p-8 shadow-elegant">
        <Link href="/" className="flex items-center gap-2 font-display font-semibold mb-8 justify-center">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary shadow-glow">
            <Sparkles className="h-4 w-4 text-primary-foreground" />
          </span>
          LyfOpt
        </Link>
        <h1 className="font-display text-2xl font-bold text-center">{title}</h1>
        <p className="mt-1.5 text-sm text-muted-foreground text-center">{subtitle}</p>
        {children}
      </div>
      <div className="mt-6 text-center text-sm text-muted-foreground">{footer}</div>
    </motion.div>
  </div>
);

const AuthForm = ({ mode }: Props) => {
  const isSignup = mode === "signup";
  const router = useRouter();
  const { loading: authLoading, session, signInWithGoogle, signInWithPassword, signUpWithPassword } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const nextPath = async (userId?: string) => {
    if (userId) {
      try {
        const dbProfile = await loadProfileFromDatabase(userId);
        if (dbProfile?.completed_at) return "/app";
      } catch {
        // Local cache fallback below.
      }
    }

    const localProfile = loadProfile();
    return localProfile?.completed_at ? "/app" : "/onboarding";
  };

  useEffect(() => {
    if (!authLoading && session?.user) {
      nextPath(session.user.id).then((path) => router.replace(path));
    }
  }, [authLoading, router, session]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    if (isSignup) {
      const { error } = await signUpWithPassword({
        email,
        password,
        name,
        redirectTo: `${window.location.origin}/onboarding`,
      });

      setLoading(false);
      if (error) {
        setError(error);
        return;
      }

      setMessage("Check your email to confirm your account, then continue to onboarding.");
      router.push("/onboarding");
      return;
    }

    const { error, userId } = await signInWithPassword(email, password);
    setLoading(false);

    if (error) {
      setError(error);
      return;
    }

    router.push(await nextPath(userId));
  };

  const handleGoogle = async () => {
    setError("");
    setMessage("");
    setLoading(true);

    const { error } = await signInWithGoogle(`${window.location.origin}/onboarding`);

    setLoading(false);
    if (error) {
      setError(error);
    }
  };

  return (
    <Layout>
      <AuthShell
        title={isSignup ? "Create your account" : "Welcome back"}
        subtitle={isSignup ? "Start optimizing in under a minute." : "Log in to continue your analysis."}
        footer={
          isSignup ? (
            <>
              Already have an account?{" "}
              <Link href="/login" className="text-foreground hover:text-primary transition-colors">
                Log in
              </Link>
            </>
          ) : (
            <>
              New to LyfOpt?{" "}
              <Link href="/signup" className="text-foreground hover:text-primary transition-colors">
                Create an account
              </Link>
            </>
          )
        }
      >
        <Button variant="glow" size="lg" className="w-full mt-6" onClick={handleGoogle} type="button" disabled={loading}>
          <GoogleIcon /> Continue with Google
        </Button>

        <div className="my-6 flex items-center gap-3">
          <div className="h-px flex-1 bg-border" />
          <span className="text-xs text-muted-foreground">or</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          {isSignup && (
            <div className="space-y-1.5">
              <Label htmlFor="name">Name</Label>
              <Input id="name" placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@domain.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              {!isSignup && (
                <Link href="/login" className="text-xs text-muted-foreground hover:text-foreground">
                  Forgot?
                </Link>
              )}
            </div>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={6}
              required
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          {message && <p className="text-sm text-primary">{message}</p>}
          <Button type="submit" variant="hero" size="lg" className="w-full mt-2" disabled={loading}>
            {loading ? "Please wait..." : isSignup ? "Create account" : "Log in"}
          </Button>
        </form>

        {isSignup && (
          <p className="mt-4 text-xs text-muted-foreground text-center">
            By signing up you agree to our terms and privacy policy.
          </p>
        )}
      </AuthShell>
    </Layout>
  );
};

export default AuthForm;
