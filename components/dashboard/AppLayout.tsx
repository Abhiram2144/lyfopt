"use client";

import { ReactNode, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { loadProfile } from "@/lib/onboarding";
import { useAuth } from "@/components/site/AuthProvider";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

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

    const p = loadProfile();
    if (!p || !p.completed_at) {
      router.replace("/onboarding");
      return;
    }

    setReady(true);
  }, [loading, router, session]);

  const logout = async () => {
    await signOut();
    localStorage.removeItem("lyfopt:profile");
    router.replace("/");
  };

  if (!ready) return null;

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-16 border-b border-border flex items-center justify-between px-4 md:px-6 sticky top-0 bg-background/80 backdrop-blur-md z-10">
            <div className="flex items-center gap-3 min-w-0">
              <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
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
          <main className="flex-1 overflow-x-hidden">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
};

