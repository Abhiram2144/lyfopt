"use client";

import { ReactNode, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppSidebar } from "./AppSidebar";
import { hasCompletedOnboarding } from "@/lib/onboarding";
import { useAuth } from "@/components/site/AuthProvider";
import { Button } from "@/components/ui/button";
import { Loader2, LogOut } from "lucide-react";

export const AppLayout = ({ children, title }: { children: ReactNode; title?: string }) => {
  const router = useRouter();
  const { session, loading, signOut } = useAuth();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (loading) return;

    if (!session?.user) {
      router.replace("/login");
      return;
    }

    const load = async () => {
      const userId = session.user.id;
      const completed = await hasCompletedOnboarding(userId);
      if (!completed) {
        router.replace("/onboarding");
        return;
      }
      setReady(true);
    };

    void load();
  }, [loading, router, session]);

  const logout = async () => {
    await signOut();
    localStorage.removeItem("lyfopt:profile");
    router.replace("/");
  };

  if (!ready) {
    return (
      <div className="grid min-h-screen place-items-center bg-background">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Preparing your command center...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex w-full bg-background overflow-x-hidden">
      <AppSidebar />
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="h-16 border-b border-border flex items-center justify-between px-4 md:px-6 sticky top-0 bg-background/80 backdrop-blur-md z-10">
          <div className="flex items-center gap-3 min-w-0">
            {title && (
              <h1 className="font-display text-base md:text-lg font-medium text-foreground truncate">
                {title}
              </h1>
            )}
          </div>
          <Button variant="ghost" size="sm" onClick={logout} className="text-muted-foreground">
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Sign out</span>
          </Button>
        </header>
        <main className="flex-1 min-w-0 overflow-x-hidden">{children}</main>
      </div>
    </div>
  );
};

