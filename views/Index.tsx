"use client";

import { Layout } from "@/components/site/Layout";
import { Reveal } from "@/components/site/Reveal";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Sparkles, ArrowRight, Brain, Target, ClipboardList,
  AlertTriangle, CheckCircle2, GraduationCap, Hammer, Rocket,
  Sun, CloudSun, Moon, X, Check, BarChart3, Shield, Clock, Flame, Layers, Gauge,
} from "lucide-react";
import { cn } from "@/lib/utils";

/* ---------- HERO ---------- */
const Hero = () => (
  <section className="relative overflow-hidden">
    <div className="absolute inset-0 bg-hero-glow pointer-events-none" />
    <div className="absolute inset-0 bg-grid opacity-40 [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)]" />
    {/* animated orb */}
    <motion.div
      aria-hidden
      className="absolute left-1/2 top-0 -translate-x-1/2 h-[520px] w-[520px] rounded-full bg-primary/20 blur-[120px]"
      animate={{ opacity: [0.35, 0.6, 0.35], scale: [1, 1.08, 1] }}
      transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
    />
    <div className="container relative pt-24 pb-24 md:pt-32 md:pb-32">
      <Reveal>
        <div className="mx-auto max-w-fit flex items-center gap-2 rounded-full border border-border bg-secondary/40 px-4 py-1.5 text-xs text-muted-foreground">
          <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse-glow" />
          AI Life Optimizer — now in early access
        </div>
      </Reveal>
      <Reveal delay={0.1}>
        <h1 className="mt-6 text-center font-display text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight text-gradient">
          Your day, decoded.<br />
          The truth about <span className="text-gradient-accent">what's holding you back.</span>
        </h1>
      </Reveal>
      <Reveal delay={0.2}>
        <p className="mt-6 mx-auto max-w-2xl text-center text-base md:text-lg text-muted-foreground">
          LyfOpt is an AI that reads your sleep, work, distractions and energy — then tells you,
          honestly, the one thing slowing you down and exactly how to fix it.
        </p>
      </Reveal>
      <Reveal delay={0.3}>
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button asChild variant="hero" size="lg" className="group">
            <Link href="/signup">
              Get Started Free
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </Button>
          <Button asChild variant="glow" size="lg">
            <a href="#how-it-works">See How It Works</a>
          </Button>
        </div>
      </Reveal>
      <Reveal delay={0.4}>
        <div className="mt-20 mx-auto max-w-4xl">
          <DashboardMock />
        </div>
      </Reveal>
    </div>
  </section>
);

const DashboardMock = () => (
  <motion.div
    className="relative"
    initial={{ opacity: 0, y: 30 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
  >
    <div className="absolute -inset-4 bg-gradient-accent opacity-20 blur-3xl rounded-3xl" />
    <div className="relative glass rounded-2xl p-6 shadow-elegant">
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">Today's Analysis</span>
        </div>
        <span className="text-xs text-muted-foreground">Generated 2m ago</span>
      </div>
      <div className="grid md:grid-cols-3 gap-4 mt-6">
        {[
          { label: "Focus Score", val: "62", sub: "—8 vs avg" },
          { label: "Distraction", val: "2h 14m", sub: "high" },
          { label: "Sleep", val: "6h 02m", sub: "below target" },
        ].map((m, i) => (
          <motion.div
            key={m.label}
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 + i * 0.1 }}
            className="rounded-xl border border-border bg-card/60 p-4"
          >
            <div className="text-xs text-muted-foreground">{m.label}</div>
            <div className="mt-2 text-2xl font-semibold font-display">{m.val}</div>
            <div className="mt-1 text-xs text-primary/80">{m.sub}</div>
          </motion.div>
        ))}
      </div>
      <div className="mt-6 rounded-xl border border-primary/30 bg-primary/5 p-4">
        <div className="flex items-start gap-3">
          <Brain className="h-5 w-5 text-primary mt-0.5" />
          <div>
            <div className="text-sm font-medium">AI Insight</div>
            <p className="text-sm text-muted-foreground mt-1">
              Your distraction spikes between 2–4pm directly correlate with poor sleep.
              Push bedtime 45 min earlier this week — it's the single biggest lever.
            </p>
          </div>
        </div>
      </div>
    </div>
  </motion.div>
);

/* ---------- PROBLEM (split layout) ---------- */
const Problem = () => (
  <section className="container py-24 border-t border-border">
    <div className="grid lg:grid-cols-2 gap-12 items-center">
      <Reveal>
        <span className="text-xs uppercase tracking-widest text-primary">The problem</span>
        <h2 className="mt-3 font-display text-3xl md:text-5xl font-bold text-gradient">
          You don't have a motivation problem.
        </h2>
        <p className="mt-5 text-muted-foreground text-lg">
          You have a <span className="text-foreground">clarity problem</span>. Most days end the same way —
          busy, drained, unsure what actually went wrong.
        </p>
        <ul className="mt-8 space-y-4">
          {[
            "You know what to do — but don't do it.",
            "Time disappears and you can't say where.",
            "Tracking habits doesn't tell you why you slipped.",
          ].map((t, i) => (
            <motion.li
              key={t}
              initial={{ opacity: 0, x: -10 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="flex items-start gap-3 text-sm"
            >
              <AlertTriangle className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              <span>{t}</span>
            </motion.li>
          ))}
        </ul>
      </Reveal>

      {/* Visual: chaotic vs structured timeline */}
      <Reveal delay={0.15}>
        <div className="rounded-2xl border border-border bg-gradient-card p-6 shadow-card">
          <div className="text-xs uppercase tracking-widest text-muted-foreground mb-4">Your day, today</div>
          <div className="space-y-2.5">
            {[
              { w: 30, label: "Deep work", tone: "primary" },
              { w: 12, label: "Focus", tone: "muted" },
              { w: 55, label: "Distraction", tone: "danger" },
              { w: 20, label: "Meetings", tone: "muted" },
              { w: 8, label: "Reset", tone: "primary" },
              { w: 70, label: "Scrolling", tone: "danger" },
            ].map((b, i) => (
              <motion.div
                key={i}
                initial={{ width: 0, opacity: 0 }}
                whileInView={{ width: `${b.w}%`, opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 + i * 0.08, duration: 0.7, ease: "easeOut" }}
                className={cn(
                  "h-7 rounded-md flex items-center px-3 text-[11px] font-medium",
                  b.tone === "primary" && "bg-primary/30 text-foreground border border-primary/40",
                  b.tone === "muted" && "bg-secondary text-muted-foreground border border-border",
                  b.tone === "danger" && "bg-destructive/20 text-destructive-foreground/80 border border-destructive/30"
                )}
              >
                {b.label}
              </motion.div>
            ))}
          </div>
          <div className="mt-5 flex items-center justify-between text-xs text-muted-foreground">
            <span>6am</span><span>noon</span><span>10pm</span>
          </div>
        </div>
      </Reveal>
    </div>
  </section>
);

/* ---------- WITH vs WITHOUT ---------- */
const Comparison = () => {
  const without = [
    { l: "Inconsistent routine", v: 35 },
    { l: "High distractions", v: 80 },
    { l: "No real feedback", v: 20 },
    { l: "Slow progress", v: 30 },
  ];
  const withL = [
    { l: "Structured day", v: 88 },
    { l: "Reduced distractions", v: 25 },
    { l: "Clear daily feedback", v: 95 },
    { l: "Consistent improvement", v: 82 },
  ];
  return (
    <section className="container py-24 border-t border-border">
      <Reveal>
        <div className="text-center max-w-2xl mx-auto">
          <span className="text-xs uppercase tracking-widest text-primary">The difference</span>
          <h2 className="mt-3 font-display text-3xl md:text-5xl font-bold text-gradient">
            Without LyfOpt vs. With LyfOpt.
          </h2>
        </div>
      </Reveal>
      <div className="mt-14 grid md:grid-cols-2 gap-5">
        {/* Without */}
        <Reveal>
          <div className="h-full rounded-2xl border border-border bg-card/40 p-7 shadow-card">
            <div className="flex items-center gap-2">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-secondary border border-border">
                <X className="h-4 w-4 text-muted-foreground" />
              </span>
              <h3 className="font-display text-xl font-semibold text-muted-foreground">Without LyfOpt</h3>
            </div>
            <div className="mt-6 space-y-5">
              {without.map((b, i) => (
                <div key={b.l}>
                  <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
                    <span>{b.l}</span><span>{b.v}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-secondary overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      whileInView={{ width: `${b.v}%` }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.1, duration: 0.8, ease: "easeOut" }}
                      className="h-full bg-muted-foreground/60"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Reveal>

        {/* With */}
        <Reveal delay={0.1}>
          <div className="relative h-full rounded-2xl border border-primary/40 bg-gradient-card p-7 shadow-glow">
            <div className="flex items-center gap-2">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary/15 border border-primary/30">
                <Check className="h-4 w-4 text-primary" />
              </span>
              <h3 className="font-display text-xl font-semibold">With LyfOpt</h3>
            </div>
            <div className="mt-6 space-y-5">
              {withL.map((b, i) => (
                <div key={b.l}>
                  <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
                    <span className="text-foreground">{b.l}</span><span className="text-primary">{b.v}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-secondary overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      whileInView={{ width: `${b.v}%` }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.1 + i * 0.1, duration: 0.9, ease: "easeOut" }}
                      className="h-full bg-gradient-accent"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
};

/* ---------- HOW IT WORKS — horizontal step flow ---------- */
const HowItWorks = () => {
  const steps = [
    { icon: ClipboardList, t: "Log your day", d: "Quick inputs on sleep, work, distractions, energy. Under a minute." },
    { icon: Brain, t: "AI analyzes", d: "Patterns, correlations, root causes — across days, not just today." },
    { icon: Target, t: "Get one fix", d: "Specific, prioritized. Direct feedback you can act on tomorrow." },
  ];
  return (
    <section id="how-it-works" className="container py-24 border-t border-border">
      <Reveal>
        <div className="text-center">
          <span className="text-xs uppercase tracking-widest text-primary">How it works</span>
          <h2 className="mt-3 font-display text-3xl md:text-5xl font-bold text-gradient">Three steps. Real clarity.</h2>
        </div>
      </Reveal>

      <div className="mt-16 relative">
        {/* connector line */}
        <div className="hidden md:block absolute top-6 left-[12%] right-[12%] h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
        <div className="grid md:grid-cols-3 gap-10 md:gap-6">
          {steps.map((s, i) => (
            <motion.div
              key={s.t}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15, duration: 0.6 }}
              className="relative text-center md:text-left"
            >
              <div className="mx-auto md:mx-0 grid h-12 w-12 place-items-center rounded-full bg-background border-2 border-primary/40 shadow-glow relative z-10">
                <s.icon className="h-5 w-5 text-primary" />
              </div>
              <div className="mt-5 font-mono text-[11px] tracking-widest text-muted-foreground">STEP 0{i + 1}</div>
              <h3 className="mt-2 font-display text-xl font-semibold">{s.t}</h3>
              <p className="mt-2 text-sm text-muted-foreground max-w-xs mx-auto md:mx-0">{s.d}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

/* ---------- AI OUTPUT — animated friendly report ---------- */
const reportSteps: Array<
  | { kind: "analyzing"; label: string }
  | { kind: "summary"; title: string; body: string }
  | { kind: "problems"; title: string; items: string[] }
  | { kind: "prescription"; title: string; items: string[] }
> = [
  { kind: "analyzing", label: "Analyzing your day..." },
  {
    kind: "summary",
    title: "Today's summary",
    body: "Moderate productivity with high distraction. Sleep is the upstream cause this week.",
  },
  {
    kind: "problems",
    title: "What went wrong",
    items: [
      "Distraction crossed 2 hours after lunch",
      "You woke up 90 minutes later than usual",
      "Zero deep-work blocks before noon",
    ],
  },
  {
    kind: "prescription",
    title: "What to do tomorrow",
    items: [
      "Move bedtime to 11:15pm for the next 5 nights",
      "Block 9–11am for one focused task",
      "Keep your phone in another room until lunch",
    ],
  },
];

const stepAccent: Record<string, { icon: typeof Brain; color: string; ring: string }> = {
  analyzing: { icon: Brain, color: "text-primary", ring: "border-primary/40" },
  summary: { icon: Sparkles, color: "text-primary", ring: "border-primary/40" },
  problems: { icon: AlertTriangle, color: "text-destructive", ring: "border-destructive/40" },
  prescription: { icon: CheckCircle2, color: "text-primary", ring: "border-primary/40" },
};

const Terminal = () => {
  const [visible, setVisible] = useState(0);
  useEffect(() => {
    if (visible >= reportSteps.length) return;
    const t = setTimeout(() => setVisible((x) => x + 1), 900);
    return () => clearTimeout(t);
  }, [visible]);

  return (
    <div className="relative">
      <div className="absolute -inset-3 bg-gradient-accent opacity-15 blur-3xl rounded-3xl" />
      <div className="relative rounded-2xl border border-border bg-gradient-to-b from-card to-background shadow-elegant overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-card/40">
          <div className="flex items-center gap-2.5">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary/15 border border-primary/30">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <div>
              <div className="text-sm font-semibold">Your Daily Report</div>
              <div className="text-[11px] text-muted-foreground">Tuesday • generated by LyfOpt</div>
            </div>
          </div>
          <span className="text-[11px] font-medium text-primary uppercase tracking-widest">
            {visible >= reportSteps.length ? "Complete" : "Live"}
          </span>
        </div>

        {/* Steps */}
        <div className="p-6 md:p-8 space-y-5 min-h-[460px]">
          {reportSteps.slice(0, visible).map((step, i) => {
            const meta = stepAccent[step.kind];
            const Icon = meta.icon;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                className="flex gap-4"
              >
                <div className={cn("shrink-0 grid h-9 w-9 place-items-center rounded-full bg-background border", meta.ring)}>
                  <Icon className={cn("h-4 w-4", meta.color)} />
                </div>
                <div className="flex-1 min-w-0">
                  {step.kind === "analyzing" && (
                    <div className="flex items-center gap-2 pt-1.5">
                      <span className="text-sm text-muted-foreground">{step.label}</span>
                      <span className="flex gap-1">
                        {[0, 1, 2].map((d) => (
                          <motion.span
                            key={d}
                            className="h-1.5 w-1.5 rounded-full bg-primary"
                            animate={{ opacity: [0.3, 1, 0.3] }}
                            transition={{ duration: 1.2, repeat: Infinity, delay: d * 0.2 }}
                          />
                        ))}
                      </span>
                    </div>
                  )}

                  {step.kind === "summary" && (
                    <>
                      <div className="text-[11px] uppercase tracking-widest text-muted-foreground">{step.title}</div>
                      <p className="mt-1.5 text-base text-foreground leading-relaxed">{step.body}</p>
                    </>
                  )}

                  {(step.kind === "problems" || step.kind === "prescription") && (
                    <>
                      <div className="text-[11px] uppercase tracking-widest text-muted-foreground">{step.title}</div>
                      <ul className="mt-2 space-y-2">
                        {step.items.map((item, j) => (
                          <motion.li
                            key={j}
                            initial={{ opacity: 0, x: -8 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.15 + j * 0.12, duration: 0.4 }}
                            className="flex items-start gap-2.5 text-sm"
                          >
                            {step.kind === "problems" ? (
                              <X className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                            ) : (
                              <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                            )}
                            <span className="text-foreground/90">{item}</span>
                          </motion.li>
                        ))}
                      </ul>
                    </>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const SampleOutput = () => (
  <section className="container py-24 border-t border-border">
    <Reveal>
      <div className="text-center max-w-2xl mx-auto">
        <span className="text-xs uppercase tracking-widest text-primary">Sample analysis</span>
        <h2 className="mt-3 font-display text-3xl md:text-5xl font-bold text-gradient">Real output. No vibes.</h2>
        <p className="mt-4 text-muted-foreground">Here's what LyfOpt produces after a single day of inputs.</p>
      </div>
    </Reveal>
    <Reveal delay={0.1}>
      <div className="mt-12 mx-auto max-w-3xl">
        <Terminal />
      </div>
    </Reveal>
  </section>
);

/* ---------- A DAY WITH LYFOPT — vertical timeline ---------- */
const DayTimeline = () => {
  const phases = [
    {
      icon: Sun, time: "08:00", title: "Morning",
      log: "Slept 6h 10m · Woke groggy",
      ai: "Sleep deficit detected. Skip the second coffee — schedule deep work before 11am while focus is still cheap.",
    },
    {
      icon: CloudSun, time: "14:30", title: "Afternoon",
      log: "Distraction spike · 47 min on phone",
      ai: "Predictable post-lunch dip. Move your reactive work (email, slack) here. Don't fight it — redirect it.",
    },
    {
      icon: Moon, time: "22:00", title: "Night",
      log: "Logged: 1 deep-work block · low energy",
      ai: "Tomorrow's lever: bedtime by 23:15. That single change unlocks 30% more focus for the rest of the week.",
    },
  ];
  return (
    <section className="container py-24 border-t border-border">
      <Reveal>
        <div className="text-center max-w-2xl mx-auto">
          <span className="text-xs uppercase tracking-widest text-primary">A day with LyfOpt</span>
          <h2 className="mt-3 font-display text-3xl md:text-5xl font-bold text-gradient">
            You log. It responds. You improve.
          </h2>
        </div>
      </Reveal>
      <div className="mt-16 relative max-w-3xl mx-auto">
        {/* vertical line */}
        <div className="absolute left-5 md:left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-primary/40 to-transparent" />
        <div className="space-y-12">
          {phases.map((p, i) => (
            <motion.div
              key={p.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.6, delay: i * 0.1 }}
              className={cn(
                "relative grid md:grid-cols-2 gap-6 items-center",
                i % 2 === 1 && "md:[&>*:first-child]:order-2"
              )}
            >
              {/* node */}
              <div className="absolute left-5 md:left-1/2 -translate-x-1/2 grid h-10 w-10 place-items-center rounded-full bg-background border-2 border-primary/50 shadow-glow z-10">
                <p.icon className="h-4 w-4 text-primary" />
              </div>
              {/* user log */}
              <div className="ml-16 md:ml-0 md:pr-12 md:text-right">
                <div className="text-xs font-mono text-primary">{p.time} · {p.title}</div>
                <div className="mt-2 inline-block rounded-xl border border-border bg-card/60 px-4 py-3 text-sm">
                  <span className="text-muted-foreground">You: </span>
                  <span className="text-foreground">{p.log}</span>
                </div>
              </div>
              {/* AI response */}
              <div className="ml-16 md:ml-0 md:pl-12">
                <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 shadow-card">
                  <div className="flex items-center gap-1.5 text-xs text-primary font-medium mb-1.5">
                    <Brain className="h-3.5 w-3.5" /> LyfOpt
                  </div>
                  <p className="text-sm">{p.ai}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

/* ---------- FEATURES — icon grid ---------- */
const Features = () => {
  const items = [
    { icon: Brain, t: "Root-cause AI", d: "Surfaces why, not just what." },
    { icon: BarChart3, t: "Pattern detection", d: "Cross-day correlations you'd never see." },
    { icon: Target, t: "One-fix focus", d: "The single highest-leverage change. Daily." },
    { icon: Layers, t: "Long-horizon trends", d: "Weekly + monthly behavioral drift." },
    { icon: Gauge, t: "Honest scoring", d: "No streaks. No badges. Just signal." },
    { icon: Shield, t: "Private by default", d: "Your data stays yours. Always." },
  ];
  return (
    <section className="container py-24 border-t border-border">
      <Reveal>
        <div className="text-center max-w-2xl mx-auto">
          <span className="text-xs uppercase tracking-widest text-primary">Features</span>
          <h2 className="mt-3 font-display text-3xl md:text-5xl font-bold text-gradient">
            Built for signal. Stripped of noise.
          </h2>
        </div>
      </Reveal>
      <div className="mt-14 grid sm:grid-cols-2 lg:grid-cols-3 gap-px bg-border rounded-2xl overflow-hidden border border-border">
        {items.map((f, i) => (
          <motion.div
            key={f.t}
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.06 }}
            whileHover={{ y: -2 }}
            className="group bg-background p-7 transition-colors hover:bg-card relative"
          >
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 border border-primary/20 group-hover:bg-primary/20 transition-colors">
              <f.icon className="h-5 w-5 text-primary" />
            </div>
            <h3 className="mt-5 font-semibold">{f.t}</h3>
            <p className="mt-1.5 text-sm text-muted-foreground">{f.d}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
};

/* ---------- USE CASES — tabs ---------- */
const UseCases = () => {
  const tabs = [
    {
      v: "students", label: "Students", icon: GraduationCap,
      title: "Stop confusing busy with productive.",
      d: "LyfOpt isolates the few habits silently destroying your study weeks — late nights, fragmented focus, low-yield review — and tells you the one to fix this week.",
      bullets: ["Cut wasted study hours", "Find your peak focus windows", "Honest exam-week feedback"],
    },
    {
      v: "builders", label: "Builders", icon: Hammer,
      title: "Ship more by removing what eats your deep work.",
      d: "Founders and indie hackers get a brutal, prioritized read on context-switching, sleep, and energy — so deep work blocks actually happen.",
      bullets: ["Protect your maker hours", "Pattern-spot burnout early", "One lever per week"],
    },
    {
      v: "pros", label: "Professionals", icon: Rocket,
      title: "Performance without the productivity-theater.",
      d: "For high-output work: LyfOpt gives you the same brutal honesty a great coach would — without the fluff, gamification, or vague advice.",
      bullets: ["Sustainable output", "Recovery as a strategy", "Clear weekly direction"],
    },
  ];
  return (
    <section className="container py-24 border-t border-border">
      <Reveal>
        <div className="text-center max-w-2xl mx-auto">
          <span className="text-xs uppercase tracking-widest text-primary">Use cases</span>
          <h2 className="mt-3 font-display text-3xl md:text-5xl font-bold text-gradient">
            Built for people who want clarity.
          </h2>
        </div>
      </Reveal>
      <div className="mt-12 max-w-4xl mx-auto">
        <Tabs defaultValue="students">
          <TabsList className="grid grid-cols-3 w-full bg-secondary/40 border border-border h-auto p-1">
            {tabs.map((t) => (
              <TabsTrigger
                key={t.v}
                value={t.v}
                className="data-[state=active]:bg-primary/15 data-[state=active]:text-foreground data-[state=active]:shadow-none gap-2 py-2.5"
              >
                <t.icon className="h-4 w-4" /> <span className="hidden sm:inline">{t.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>
          {tabs.map((t) => (
            <TabsContent key={t.v} value={t.v} className="mt-8">
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="rounded-2xl border border-border bg-gradient-card p-8 md:p-10 shadow-card"
              >
                <h3 className="font-display text-2xl md:text-3xl font-bold">{t.title}</h3>
                <p className="mt-4 text-muted-foreground max-w-2xl">{t.d}</p>
                <ul className="mt-6 grid sm:grid-cols-3 gap-3">
                  {t.bullets.map((b) => (
                    <li key={b} className="flex items-start gap-2 text-sm rounded-lg border border-border bg-card/40 px-3 py-2.5">
                      <Flame className="h-4 w-4 text-primary shrink-0 mt-0.5" /> {b}
                    </li>
                  ))}
                </ul>
              </motion.div>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </section>
  );
};

/* ---------- FINAL CTA — full width ---------- */
const FinalCTA = () => (
  <section className="relative mt-12 border-t border-border overflow-hidden">
    <div className="absolute inset-0 bg-hero-glow" />
    <motion.div
      aria-hidden
      className="absolute inset-0 opacity-60"
      animate={{ backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"] }}
      transition={{ duration: 14, repeat: Infinity, ease: "linear" }}
      style={{
        backgroundImage:
          "radial-gradient(60% 60% at 20% 50%, hsl(var(--primary) / 0.15), transparent 70%), radial-gradient(60% 60% at 80% 50%, hsl(var(--primary) / 0.12), transparent 70%)",
        backgroundSize: "200% 100%",
      }}
    />
    <div className="container relative py-28 md:py-36 text-center">
      <Reveal>
        <Clock className="h-6 w-6 text-primary mx-auto" />
        <h2 className="mt-6 font-display text-3xl md:text-6xl font-bold text-gradient max-w-3xl mx-auto">
          Stop guessing. Start optimizing.
        </h2>
        <p className="mt-5 text-muted-foreground max-w-xl mx-auto">
          Honest analysis. One fix that matters. Every single day.
        </p>
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button asChild variant="hero" size="lg" className="group">
            <Link href="/signup">
              Get Started Free
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </Button>
          <Button asChild variant="glow" size="lg">
            <Link href="/pricing">See pricing</Link>
          </Button>
        </div>
        <div className="mt-6 text-xs text-muted-foreground flex items-center justify-center gap-1.5">
          <CheckCircle2 className="h-3.5 w-3.5 text-primary" /> No credit card · Cancel anytime
        </div>
      </Reveal>
    </div>
  </section>
);

const Index = () => (
  <Layout>
    <Hero />
    <Problem />
    <Comparison />
    <HowItWorks />
    <SampleOutput />
    <DayTimeline />
    <Features />
    <UseCases />
    <FinalCTA />
  </Layout>
);

export default Index;
