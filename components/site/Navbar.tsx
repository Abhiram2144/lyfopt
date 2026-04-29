"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Menu, X, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/site/AuthProvider";
import { useRouter } from "next/navigation";

const links = [
  { to: "/", label: "Home" },
  { to: "/about", label: "About" },
  { to: "/pricing", label: "Pricing" },
];

export const Navbar = () => {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname() ?? "";
  const router = useRouter();
  const { loading, session, signOut } = useAuth();
  const isActive = (href: string) => pathname === href || (href !== "/" && pathname.startsWith(href));

  const logout = async () => {
    await signOut();
    localStorage.removeItem("lyfopt:profile");
    router.push("/");
  };

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => setOpen(false), [pathname]);

  return (
    <header
      className={cn(
        "fixed top-0 inset-x-0 z-50 transition-all duration-300",
        scrolled ? "border-b border-border/60 bg-background/70 backdrop-blur-xl" : "bg-transparent"
      )}
    >
      <nav className="container flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-display font-semibold tracking-tight">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary shadow-glow">
            <Sparkles className="h-4 w-4 text-primary-foreground" />
          </span>
          <span className="text-base">LyfOpt</span>
        </Link>

        <div className="hidden md:flex items-center gap-1">
          {links.map((l) => (
            <Link
              key={l.to}
              href={l.to}
              className={cn(
                "px-4 py-2 text-sm rounded-md transition-colors",
                isActive(l.to) ? "text-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {l.label}
            </Link>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-2">
          {session ? (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link href="/app">Dashboard</Link>
              </Button>
              <Button variant="hero" size="sm" onClick={logout}>
                Sign out
              </Button>
            </>
          ) : (
            !loading && (
              <>
                <Button asChild variant="ghost" size="sm">
                  <Link href="/login">Log in</Link>
                </Button>
                <Button asChild variant="hero" size="sm">
                  <Link href="/signup">Get Started</Link>
                </Button>
              </>
            )
          )}
        </div>

        <button
          className="md:hidden p-2 rounded-md text-foreground"
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </nav>

      {open && (
        <div className="md:hidden border-t border-border bg-background/95 backdrop-blur-xl">
          <div className="container py-4 flex flex-col gap-1">
            {links.map((l) => (
              <Link
                key={l.to}
                href={l.to}
                className={cn(
                  "px-3 py-2 rounded-md text-sm",
                  isActive(l.to) ? "bg-secondary text-foreground" : "text-muted-foreground"
                )}
              >
                {l.label}
              </Link>
            ))}
            <div className="flex gap-2 pt-2">
              {session ? (
                <>
                  <Button asChild variant="ghost" size="sm" className="flex-1">
                    <Link href="/app">Dashboard</Link>
                  </Button>
                  <Button variant="hero" size="sm" className="flex-1" onClick={logout}>
                    Sign out
                  </Button>
                </>
              ) : (
                !loading && (
                  <>
                    <Button asChild variant="ghost" size="sm" className="flex-1">
                      <Link href="/login">Log in</Link>
                    </Button>
                    <Button asChild variant="hero" size="sm" className="flex-1">
                      <Link href="/signup">Get Started</Link>
                    </Button>
                  </>
                )
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
