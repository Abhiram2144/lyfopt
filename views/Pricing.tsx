"use client";

import { Layout } from "@/components/site/Layout";
import { Reveal } from "@/components/site/Reveal";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

const tiers = [
  {
    name: "Free",
    price: "$0",
    cadence: "forever",
    desc: "Try the core alignment tracker. See the value before you pay.",
    features: [
      "3 AI analyses per week",
      "Basic feedback",
      "7-day history",
    ],
    cta: "Start free",
    highlight: false,
  },
  {
    name: "Pro",
    price: "$9",
    cadence: "/ month",
    desc: "For people serious about fixing what's slowing them down.",
    features: [
      "Unlimited analyses",
      "Full insights & root-cause detection",
      "Weekly summary",
      "Unlimited history",
    ],
    cta: "Get Pro",
    highlight: true,
  },
  {
    name: "Premium",
    price: "$24",
    cadence: "/ month",
    desc: "Maximum depth. For builders, athletes, and high-output work.",
    features: [
      "Everything in Pro",
      "Goal-based feedback",
      "Weekly contribution summary",
      "Long-horizon progress view",
    ],
    cta: "Get Premium",
    highlight: false,
  },
];

const Pricing = () => (
  <Layout>
    <section className="relative">
      <div className="absolute inset-0 bg-hero-glow pointer-events-none" />
      <div className="container relative pt-20 pb-12 text-center">
        <Reveal>
          <span className="text-xs uppercase tracking-widest text-primary">Pricing</span>
          <h1 className="mt-4 font-display text-4xl md:text-6xl font-bold text-gradient">
            Simple. Honest. No tricks.
          </h1>
          <p className="mt-5 text-muted-foreground max-w-xl mx-auto">
            Start free. Upgrade when LyfOpt is genuinely making your weeks better.
          </p>
        </Reveal>
      </div>
    </section>

    <section className="container pb-24">
      <div className="grid md:grid-cols-3 gap-5 max-w-6xl mx-auto">
        {tiers.map((t, i) => (
          <Reveal key={t.name} delay={i * 0.08}>
            <div
              className={cn(
                "relative h-full rounded-2xl border p-8 transition-all duration-300 flex flex-col hover:-translate-y-1",
                t.highlight
                  ? "border-primary/50 bg-gradient-card shadow-glow scale-[1.02]"
                  : "border-border bg-gradient-card shadow-card hover:border-primary/30"
              )}
            >
              {t.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-accent px-3 py-1 text-xs font-medium text-primary-foreground">
                  Most popular
                </div>
              )}
              <h3 className="font-display text-xl font-semibold">{t.name}</h3>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="font-display text-4xl font-bold">{t.price}</span>
                <span className="text-sm text-muted-foreground">{t.cadence}</span>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">{t.desc}</p>
              <ul className="mt-6 space-y-3 flex-1">
                {t.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm">
                    <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>
              <div className="mt-8">
                <Button asChild variant={t.highlight ? "hero" : "glow"} size="lg" className="w-full">
                  <Link href="/signup">{t.cta}</Link>
                </Button>
              </div>
            </div>
          </Reveal>
        ))}
      </div>

      <Reveal>
        <p className="mt-12 text-center text-sm text-muted-foreground">
          All plans include cancel-anytime. No data sold. Ever.
        </p>
      </Reveal>
    </section>
  </Layout>
);

export default Pricing;
