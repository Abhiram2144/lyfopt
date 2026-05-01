"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { AppLayout } from "@/components/dashboard/AppLayout";
import { Button } from "@/components/ui/button";
import {
  Sparkles,
  Brain,
  AlertTriangle,
  CheckCircle2,
  ThumbsUp,
  ArrowLeft,
  Target,
  Zap,
} from "lucide-react";
import { loadProfileFromDatabase, type OnboardingProfile } from "@/lib/onboarding";
import { getErrorMessage } from "@/lib/error";
import {
  computeMetrics,
  fetchDailyLogsFromDb,
  fetchGoalsFromDb,
  fetchSessionsFromDb,
  fmtMins,
  type ComputedMetrics,
  type DailyLog,
  type Goal,
} from "@/lib/sessions";
import { useAuth } from "@/components/site/AuthProvider";
import { cn } from "@/lib/utils";

const buildReport = (
  log: DailyLog,
  m: ComputedMetrics,
  tone: string,
) => {
  const problems: string[] = [];
  const positives: string[] = [];
  const suggestions: string[] = [];

  if (m.distraction >= 120) {
    problems.push(`${fmtMins(m.distraction)} lost to distraction — that's your biggest leak.`);
    suggestions.push("Block the source: phone in another room during your peak hours.");
  } else if (m.distraction > 0) {
    positives.push("Distraction stayed under control today.");
  }

  if (m.untracked > m.awakeMinutes * 0.3) {
    problems.push(`${fmtMins(m.untracked)} unaccounted for — that's where your day disappears.`);
    suggestions.push("Log gaps too. The invisible hours are usually the costly ones.");
  }

  if (m.efficiencyScore < 30) {
    problems.push(`Only ${m.efficiencyScore}% of your day was productive.`);
    suggestions.push("Schedule one protected 90-minute deep-work block tomorrow.");
  } else if (m.efficiencyScore >= 50) {
    positives.push(`Strong: ${m.efficiencyScore}% of your day went to productive work.`);
  }

  if (m.goalScore >= 25) {
    positives.push(`${m.goalScore}% of your day moved your goals forward.`);
  } else if (m.goalBreakdown.length === 0) {
    problems.push("Zero time on goal-aligned activities today.");
    suggestions.push("Pick one goal. Block 60 minutes for it tomorrow before noon.");
  }

  const top = m.topActivity;
  const summary =
    tone === "strict"
      ? `${m.efficiencyScore}% effective. ${m.distraction >= 120 ? "Distraction killed your peak." : "Untracked time is hiding the truth."} Stop pretending the day was full.`
      : tone === "supportive"
        ? `You had ${fmtMins(m.productive)} of real productive time${top ? `, mostly on ${top.title}` : ""}. A few clear levers exist for tomorrow.`
        : `Moderate day. ${fmtMins(m.productive)} productive, ${fmtMins(m.distraction)} distracted. ${m.goalScore < 20 ? "Goal alignment is the next lever." : "Goal alignment is holding."}`;

  const core_problem =
    problems[0] ?? "No critical issues today — but consistency is the real test.";
  const key_action =
    suggestions[0] ?? "Repeat tomorrow. Patterns become visible after 14 days.";

  return { summary, problems, positives, suggestions, core_problem, key_action };
};

const AnalysisResult = () => {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [stage, setStage] = useState<"analyzing" | "report">("analyzing");
  const [log, setLog] = useState<DailyLog | null>(null);
  const [metrics, setMetrics] = useState<ComputedMetrics | null>(null);
  const [profile, setProfile] = useState<OnboardingProfile | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const load = async () => {
      if (loading || !user) return;

      const id = sessionStorage.getItem("lyfopt:analyze:logId");
      try {
        const [logs, sessions, goals] = await Promise.all([
          fetchDailyLogsFromDb(),
          fetchSessionsFromDb(),
          fetchGoalsFromDb(),
        ]);
        const found = id ? logs.find((entry) => entry.id === id) : logs[logs.length - 1] ?? null;
        if (!found) {
          if (active) router.replace("/app/log");
          return;
        }
        const foundSessions = sessions.filter((session) => session.log_id === found.id);
        const reportMetrics = computeMetrics(found, foundSessions, goals);
        const savedProfile = await loadProfileFromDatabase(user.id);

        if (!active) return;
        setLog(found);
        setMetrics(reportMetrics);
        setProfile(savedProfile);
        const timer = setTimeout(() => setStage("report"), 2000);
        return () => clearTimeout(timer);
      } catch (error) {
        if (!active) return;
        setLoadError(getErrorMessage(error));
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, [loading, router, user]);

  const report = log && metrics ? buildReport(log, metrics, profile?.feedback_style ?? "balanced") : null;

  return (
    <AppLayout title="Analysis">
      <div className="px-4 md:px-8 py-6 md:py-10 max-w-3xl mx-auto">
        {loadError && (
          <div className="mb-6 rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-foreground">
            {loadError}
          </div>
        )}

        <Link
          href="/app/log"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to log
        </Link>

        <AnimatePresence mode="wait">
          {stage === "analyzing" && (
            <motion.div
              key="a"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="rounded-2xl border border-border bg-card p-12 flex flex-col items-center gap-6"
            >
              <div className="relative">
                <div className="absolute inset-0 rounded-full bg-primary/30 blur-2xl animate-pulse-glow" />
                <div className="relative grid h-16 w-16 place-items-center rounded-full bg-primary/10 border border-primary/40">
                  <Brain className="h-7 w-7 text-primary" />
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span>Analyzing your day</span>
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
              <div className="w-full max-w-sm space-y-2">
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    className="h-2.5 rounded bg-linear-to-r from-card via-secondary to-card bg-size-[200%_100%]"
                    animate={{ backgroundPosition: ["200% 0", "-200% 0"] }}
                    transition={{ duration: 1.6, repeat: Infinity, ease: "linear", delay: i * 0.15 }}
                    style={{ width: `${100 - i * 12}%` }}
                  />
                ))}
              </div>
            </motion.div>
          )}

          {stage === "report" && report && metrics && (
            <motion.div key="r" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
              {/* Score row */}
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="grid grid-cols-3 gap-3"
              >
                <ScorePill icon={Zap} label="Efficiency" value={`${metrics.efficiencyScore}%`} />
                <ScorePill icon={Target} label="Goal score" value={`${metrics.goalScore}%`} />
                <ScorePill icon={AlertTriangle} label="Wasted" value={fmtMins(metrics.distraction)} dim />
              </motion.div>

              <Block delay={0.1} icon={<Sparkles className="h-4 w-4 text-primary" />} title="Summary">
                <p className="text-base text-foreground leading-relaxed">{report.summary}</p>
              </Block>

              <Block delay={0.25} icon={<AlertTriangle className="h-4 w-4 text-destructive" />} title="Core problem">
                <p className="text-sm text-foreground/90 leading-relaxed">{report.core_problem}</p>
              </Block>

              <Block delay={0.4} icon={<CheckCircle2 className="h-4 w-4 text-primary" />} title="Key action">
                <p className="text-sm text-foreground/90 leading-relaxed">{report.key_action}</p>
              </Block>

              <List
                title="Problems"
                icon={<AlertTriangle className="h-4 w-4 text-destructive" />}
                items={report.problems}
                bulletClass="text-destructive"
                startDelay={0.55}
              />
              <List
                title="Positives"
                icon={<ThumbsUp className="h-4 w-4 text-primary" />}
                items={report.positives}
                bulletClass="text-primary"
                startDelay={0.55 + report.problems.length * 0.18}
              />
              <List
                title="Suggestions"
                icon={<CheckCircle2 className="h-4 w-4 text-primary" />}
                items={report.suggestions}
                bulletClass="text-primary"
                startDelay={0.55 + (report.problems.length + report.positives.length) * 0.18}
              />

              <div className="flex gap-3 pt-2">
                <Button asChild variant="hero">
                  <Link href="/app">Back to dashboard</Link>
                </Button>
                <Button asChild variant="glow">
                  <Link href="/app/log">Log another</Link>
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AppLayout>
  );
};

const ScorePill = ({
  icon: Icon,
  label,
  value,
  dim,
}: {
  icon: typeof Target;
  label: string;
  value: string;
  dim?: boolean;
}) => (
  <div className={cn("rounded-xl border bg-card p-4", dim ? "border-destructive/30" : "border-primary/30")}>
    <div className="flex items-center justify-between">
      <Icon className={cn("h-4 w-4", dim ? "text-destructive" : "text-primary")} />
    </div>
    <div className={cn("mt-2 font-display text-xl font-semibold", dim ? "text-destructive" : "text-primary")}>
      {value}
    </div>
    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
  </div>
);

const Block = ({
  delay,
  icon,
  title,
  children,
}: {
  delay: number;
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) => (
  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay }}>
    <div className="flex items-center gap-2 mb-2">
      {icon}
      <span className="text-[11px] uppercase tracking-widest text-muted-foreground">{title}</span>
    </div>
    <div className="rounded-xl border border-border bg-card p-5">{children}</div>
  </motion.div>
);

const List = ({
  title,
  icon,
  items,
  bulletClass,
  startDelay,
}: {
  title: string;
  icon: React.ReactNode;
  items: string[];
  bulletClass: string;
  startDelay: number;
}) => {
  if (items.length === 0) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
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
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: startDelay + i * 0.18, duration: 0.35 }}
            className="flex items-start gap-2.5 rounded-xl border border-border bg-card px-4 py-3 text-sm"
          >
            <span className={cn("mt-0.5 text-base leading-none", bulletClass)}>•</span>
            <span className="text-foreground/90 leading-relaxed">{t}</span>
          </motion.li>
        ))}
      </ul>
    </motion.div>
  );
};

export default AnalysisResult;

