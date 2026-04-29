"use client";

import { Layout } from "@/components/site/Layout";
import { Reveal } from "@/components/site/Reveal";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowRight, Compass, Heart, Lightbulb } from "lucide-react";

const About = () => (
  <Layout>
    <section className="relative">
      <div className="absolute inset-0 bg-hero-glow pointer-events-none" />
      <div className="container relative pt-20 pb-16 max-w-3xl">
        <Reveal>
          <span className="text-xs uppercase tracking-widest text-primary">About LyfOpt</span>
          <h1 className="mt-4 font-display text-4xl md:text-6xl font-bold text-gradient">
            We don't need more data. We need clarity.
          </h1>
        </Reveal>
        <Reveal delay={0.1}>
          <p className="mt-6 text-lg text-muted-foreground">
            LyfOpt was built out of a simple frustration: every productivity app shows you
            charts, streaks and numbers — but none of them ever say the one thing you need
            to hear: <em className="text-foreground not-italic">"this is what's actually breaking your day."</em>
          </p>
        </Reveal>
      </div>
    </section>

    <section className="container max-w-3xl pb-16 space-y-10 text-muted-foreground leading-relaxed text-lg">
      <Reveal>
        <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground">Why I built this</h2>
        <p className="mt-3">
          I didn't lack discipline. I lacked <span className="text-foreground">awareness</span>.
          I'd end weeks exhausted with nothing to show, convinced I needed another system, another app, another
          push. The truth was simpler: I had no honest mirror. No one — and nothing — telling me which two
          habits were quietly costing me everything.
        </p>
      </Reveal>
      <Reveal>
        <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground">Why an AI</h2>
        <p className="mt-3">
          Patterns hide in noise. Sleep affects focus three days later. A bad Monday morning
          shows up as a missed Friday goal. Humans are bad at seeing this. AI is great at it.
          We use that — and only that — to give you direct, prioritized feedback.
        </p>
      </Reveal>
      <Reveal>
        <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground">What we won't do</h2>
        <p className="mt-3">
          No streaks. No badges. No fake gamification. No notifications that pretend to care.
          LyfOpt is a tool you open when you want to know the truth about your day — and then close.
        </p>
      </Reveal>
    </section>

    <section className="container py-16 border-t border-border">
      <div className="grid md:grid-cols-3 gap-5 max-w-5xl mx-auto">
        {[
          { icon: Compass, t: "Direction over data", d: "We surface the one fix that matters most — not 47 charts." },
          { icon: Heart, t: "Honest by default", d: "If you wasted the day, we'll say so. Politely. But clearly." },
          { icon: Lightbulb, t: "Built for action", d: "Every insight ends in a specific thing to try tomorrow." },
        ].map((v, i) => (
          <Reveal key={v.t} delay={i * 0.1}>
            <div className="h-full rounded-2xl border border-border bg-gradient-card p-6 shadow-card">
              <v.icon className="h-5 w-5 text-primary" />
              <h3 className="mt-4 font-semibold">{v.t}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{v.d}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>

    <section className="container py-20 text-center">
      <Reveal>
        <h2 className="font-display text-3xl md:text-4xl font-bold text-gradient">Ready to see what's holding you back?</h2>
        <div className="mt-8">
          <Button asChild variant="hero" size="lg">
            <Link href="/signup">Get Started <ArrowRight className="h-4 w-4" /></Link>
          </Button>
        </div>
      </Reveal>
    </section>
  </Layout>
);

export default About;
