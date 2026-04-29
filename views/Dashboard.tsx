"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/site/AuthProvider";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, Brain, AlertTriangle, CheckCircle2, LogOut, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { loadProfile, loadProfileFromDatabase, type OnboardingProfile } from "@/lib/onboarding";

interface DayInput {
  sleepHours: number;
  focusHours: number;
  distractionHours: number;
  energy: number; // 1-5
  notes: string;
}

interface AIReport {
  summary: string;
  problems: string[];
  suggestions: string[];
}

const generateMockReport = (input: DayInput, profile: OnboardingProfile | null): AIReport => {
  const problems: string[] = [];
  const suggestions: string[] = [];

  if (input.sleepHours < 7) {
    problems.push(`Only ${input.sleepHours.toFixed(1)}h of sleep — below your recovery threshold.`);
    suggestions.push("Move bedtime 45 minutes earlier tonight. Sleep is your highest-leverage fix.");
  }
  if (input.distractionHours >= 2) {
    problems.push(`${input.distractionHours.toFixed(1)}h lost to distraction — that's your biggest leak today.`);
    suggestions.push("Tomorrow: phone in another room from 9am to lunch. Block the source, not the symptom.");
  }
  if (input.focusHours < 2) {
    problems.push("Less than 2h of real focus work — output will follow.");
    suggestions.push("Schedule one 90-minute deep-work block before noon. Protect it like a meeting.");
  }
  if (input.energy <= 2) {
    problems.push("Energy is critically low. Pushing through will make tomorrow worse.");
    suggestions.push("End work by 7pm. Walk 20 minutes. No screens after 10pm.");
  }

  if (problems.length === 0) {
    problems.push("No critical issues. Your day held together.");
  }
  if (suggestions.length === 0) {
    suggestions.push("Stay the course. Repeat tomorrow and watch the trend.");
  }

  const tone = profile?.feedback_style ?? "balanced";
  const summary =
    tone === "strict"
      ? `Mixed day. ${input.distractionHours >= 2 ? "Distraction was the killer." : "Energy and sleep need work."} Stop optimizing what's already fine.`
      : tone === "supportive"
        ? `Solid effort today. A few clear levers exist for tomorrow — small changes, real impact.`
        : `Moderate output. ${input.sleepHours < 7 ? "Sleep is the upstream cause." : "Focus quality is the next lever."}`;

  return { summary, problems, suggestions };
};

const Dashboard = () => {
  const router = useRouter();
  const { loading: authLoading, session, signOut } = useAuth();
  const [profile, setProfile] = useState<OnboardingProfile | null>(null);
  const [input, setInput] = useState<DayInput>({
    sleepHours: 6,
    focusHours: 2,
    distractionHours: 2,
    energy: 3,
    notes: "",
  });
  const [stage, setStage] = useState<"idle" | "analyzing" | "report">("idle");
  const [report, setReport] = useState<AIReport | null>(null);

  useEffect(() => {
    if (authLoading) return;

    if (!session) {
      router.replace("/login");
      return;
    }

    let cancelled = false;

    const load = async () => {
      try {
        const dbProfile = await loadProfileFromDatabase(session.user.id);
        if (cancelled) return;

        const p = dbProfile ?? loadProfile();
        if (!p || !p.completed_at) {
          router.replace("/onboarding");
          return;
        }

        setProfile(p);
      } catch {
        if (cancelled) return;

        const p = loadProfile();
        if (!p || !p.completed_at) {
          router.replace("/onboarding");
          return;
        }

        setProfile(p);
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [authLoading, router, session]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setStage("analyzing");
    setReport(null);
    window.setTimeout(() => {
      setReport(generateMockReport(input, profile));
      setStage("report");
    }, 2400);
  };

  const reset = () => {
    setStage("idle");
    setReport(null);
  };

  const logout = async () => {
    await signOut();
    localStorage.removeItem("lyfopt:profile");
    router.replace("/");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="container flex h-16 items-center justify-between">
          <Link href="/app" className="flex items-center gap-2 font-display font-semibold">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary shadow-glow">
              <Sparkles className="h-4 w-4 text-primary-foreground" />
            </span>
            LyfOpt
          </Link>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={logout}>
              <LogOut className="h-4 w-4" /> Sign out
            </Button>
          </div>
        </div>
      </header>

      <main className="container py-10 md:py-14 max-w-5xl">
        <div className="mb-10">
          <h1 className="font-display text-3xl md:text-4xl font-bold text-gradient">Today's check-in</h1>
          <p className="mt-2 text-muted-foreground">
            Log your day. Get one honest read on what to fix tomorrow.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Form */}
          <section className="rounded-2xl border border-border bg-card p-6 md:p-8">
            <h2 className="font-display text-xl font-semibold">Log your day</h2>
            <form onSubmit={handleSubmit} className="mt-6 space-y-7">
              <SliderField
                label="Sleep"
                value={input.sleepHours}
                min={0}
                max={12}
                step={0.5}
                suffix="h"
                onChange={(v) => setInput((s) => ({ ...s, sleepHours: v }))}
              />
              <SliderField
                label="Focused work"
                value={input.focusHours}
                min={0}
                max={10}
                step={0.5}
                suffix="h"
                onChange={(v) => setInput((s) => ({ ...s, focusHours: v }))}
              />
              <SliderField
                label="Distraction time"
                value={input.distractionHours}
                min={0}
                max={8}
                step={0.5}
                suffix="h"
                onChange={(v) => setInput((s) => ({ ...s, distractionHours: v }))}
              />
              <SliderField
                label="Energy"
                value={input.energy}
                min={1}
                max={5}
                step={1}
                suffix=" / 5"
                onChange={(v) => setInput((s) => ({ ...s, energy: v }))}
              />

              <div className="space-y-2">
                <Label htmlFor="notes">Anything else?</Label>
                <Textarea
                  id="notes"
                  placeholder="Optional — a sentence or two on how the day actually felt."
                  value={input.notes}
                  onChange={(e) => setInput((s) => ({ ...s, notes: e.target.value }))}
                  className="min-h-[90px] bg-background border-border"
                />
              </div>

              <Button type="submit" variant="hero" size="lg" className="w-full" disabled={stage === "analyzing"}>
                {stage === "analyzing" ? "Analyzing..." : "Run analysis"}
              </Button>
            </form>
          </section>

          {/* Output */}
          <section className="rounded-2xl border border-border bg-card p-6 md:p-8 min-h-[480px]">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-xl font-semibold">AI analysis</h2>
              {stage === "report" && (
                <Button variant="ghost" size="sm" onClick={reset}>
                  <RefreshCw className="h-3.5 w-3.5" /> New
                </Button>
              )}
            </div>

            <div className="mt-6">
              <AnimatePresence mode="wait">
                {stage === "idle" && (
                  <motion.div
                    key="idle"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="text-sm text-muted-foreground py-12 text-center"
                  >
                    Your daily report will appear here.
                  </motion.div>
                )}

                {stage === "analyzing" && <AnalyzingState key="analyzing" />}

                {stage === "report" && report && <ReportView key="report" report={report} />}
              </AnimatePresence>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
};

const SliderField = ({
  label,
  value,
  min,
  max,
  step,
  suffix,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  suffix?: string;
  onChange: (v: number) => void;
}) => (
  <div>
    <div className="flex items-center justify-between mb-3">
      <Label className="text-sm">{label}</Label>
      <span className="text-sm font-mono text-primary">
        {value}
        {suffix}
      </span>
    </div>
    <Slider value={[value]} min={min} max={max} step={step} onValueChange={(v) => onChange(v[0])} />
  </div>
);

const AnalyzingState = () => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="py-12 flex flex-col items-center gap-6"
  >
    <div className="relative">
      <div className="absolute inset-0 rounded-full bg-primary/20 blur-2xl animate-pulse-glow" />
      <div className="relative grid h-14 w-14 place-items-center rounded-full bg-primary/10 border border-primary/40">
        <Brain className="h-6 w-6 text-primary" />
      </div>
    </div>
    <div className="flex items-center gap-2">
      <span className="text-sm text-foreground">Analyzing your day</span>
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
    {/* Shimmer skeleton */}
    <div className="w-full space-y-2">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="h-3 rounded bg-gradient-to-r from-card via-secondary to-card bg-[length:200%_100%]"
          animate={{ backgroundPosition: ["200% 0", "-200% 0"] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "linear", delay: i * 0.15 }}
          style={{ width: `${100 - i * 12}%` }}
        />
      ))}
    </div>
  </motion.div>
);

const ReportView = ({ report }: { report: AIReport }) => {
  const items: Array<{ kind: "summary" | "problem" | "suggestion"; text: string }> = [
    { kind: "summary", text: report.summary },
    ...report.problems.map((t) => ({ kind: "problem" as const, text: t })),
    ...report.suggestions.map((t) => ({ kind: "suggestion" as const, text: t })),
  ];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-5">
      {/* Summary */}
      <ProgressiveBlock delay={0} title="Summary" icon={<Sparkles className="h-4 w-4 text-primary" />}>
        <p className="text-base leading-relaxed">{report.summary}</p>
      </ProgressiveBlock>

      <ProgressiveList
        title="What went wrong"
        icon={<AlertTriangle className="h-4 w-4 text-destructive" />}
        items={report.problems}
        startDelay={0.5}
        bulletClass="text-destructive"
      />

      <ProgressiveList
        title="What to do tomorrow"
        icon={<CheckCircle2 className="h-4 w-4 text-primary" />}
        items={report.suggestions}
        startDelay={0.5 + report.problems.length * 0.25}
        bulletClass="text-primary"
      />
      <span className="hidden">{items.length}</span>
    </motion.div>
  );
};

const ProgressiveBlock = ({
  delay,
  title,
  icon,
  children,
}: {
  delay: number;
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, delay, ease: [0.16, 1, 0.3, 1] }}
  >
    <div className="flex items-center gap-2 mb-2">
      {icon}
      <span className="text-[11px] uppercase tracking-widest text-muted-foreground">{title}</span>
    </div>
    <div className="rounded-xl border border-border bg-background/50 p-4">{children}</div>
  </motion.div>
);

const ProgressiveList = ({
  title,
  icon,
  items,
  startDelay,
  bulletClass,
}: {
  title: string;
  icon: React.ReactNode;
  items: string[];
  startDelay: number;
  bulletClass: string;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.4, delay: startDelay - 0.1 }}
  >
    <div className="flex items-center gap-2 mb-2">
      {icon}
      <span className="text-[11px] uppercase tracking-widest text-muted-foreground">{title}</span>
    </div>
    <ul className="space-y-2">
      {items.map((t, i) => (
        <motion.li
          key={i}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: startDelay + i * 0.25, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className={cn(
            "flex items-start gap-2.5 rounded-xl border border-border bg-background/50 px-4 py-3 text-sm"
          )}
        >
          <span className={cn("mt-0.5 text-base leading-none", bulletClass)}>•</span>
          <span className="text-foreground/90">{t}</span>
        </motion.li>
      ))}
    </ul>
  </motion.div>
);

export default Dashboard;
