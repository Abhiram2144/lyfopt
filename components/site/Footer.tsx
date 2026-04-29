import Link from "next/link";
import { Sparkles } from "lucide-react";

export const Footer = () => (
  <footer className="border-t border-border mt-24">
    <div className="container py-12 grid gap-8 md:grid-cols-4">
      <div className="md:col-span-2">
        <Link href="/" className="flex items-center gap-2 font-display font-semibold">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary">
            <Sparkles className="h-4 w-4 text-primary-foreground" />
          </span>
          LyfOpt
        </Link>
        <p className="mt-4 text-sm text-muted-foreground max-w-sm">
          AI that analyzes your day and tells you what's actually holding you back.
        </p>
      </div>
      <div>
        <h4 className="text-sm font-semibold mb-3">Product</h4>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li><Link href="/pricing" className="hover:text-foreground transition-colors">Pricing</Link></li>
          <li><Link href="/about" className="hover:text-foreground transition-colors">About</Link></li>
        </ul>
      </div>
      <div>
        <h4 className="text-sm font-semibold mb-3">Account</h4>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li><Link href="/login" className="hover:text-foreground transition-colors">Log in</Link></li>
          <li><Link href="/signup" className="hover:text-foreground transition-colors">Sign up</Link></li>
        </ul>
      </div>
    </div>
    <div className="border-t border-border">
      <div className="container py-6 flex items-center justify-between text-xs text-muted-foreground">
        <span>© {new Date().getFullYear()} LyfOpt. All rights reserved.</span>
        <span>Built for clarity.</span>
      </div>
    </div>
  </footer>
);
