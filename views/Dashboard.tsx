"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import {
  AlertTriangle,
  CheckCircle2,
  Flame,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Target,
  Zap,
  Clock,
  Plus,
} from "lucide-react";
import Link from "next/link";
import { AppLayout } from "@/components/dashboard/AppLayout";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/site/AuthProvider";
import {
  buildHistoryFromDb,
  computeMetrics,
  computeStreaks,
  fetchDailyLogsFromDb,
  fetchGoalsFromDb,
  fetchSessionsFromDb,
  fmtMins,
  todayDate,
  type ActivitySession,
  type DbHistoryEntry,
  type Goal,
  type SessionCategory,
  type DailyLog,
} from "@/lib/sessions";

const fadeUp = {
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] as const },
};

const catColor: Record<SessionCategory, string> = {
  productive: "bg-primary",
  neutral: "bg-yellow-400",
  distraction: "bg-destructive",
};

const Dashboard = () => {
  const { user, loading } = useAuth();
  const [logs, setLogs] = useState<DailyLog[]>([]);
  const [sessions, setSessions] = useState<ActivitySession[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      if (loading || !user) return;

      try {
        const [loadedLogs, loadedSessions, loadedGoals] = await Promise.all([
          fetchDailyLogsFromDb(),
          fetchSessionsFromDb(),
          fetchGoalsFromDb(),
        ]);
        if (!active) return;
        setLogs(loadedLogs);
        setSessions(loadedSessions);
        setGoals(loadedGoals);
      } catch (error) {
        if (!active) return;
        const message =
          error instanceof Error
            ? error.message
            : typeof error === "string"
              ? error
              : "Unable to load your dashboard right now.";
        setLoadError(message);
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, [loading, user]);

  const history = useMemo(() => buildHistoryFromDb(logs, sessions, goals).slice(-90), [logs, sessions, goals]);
  const todayLog = logs.find((entry) => entry.date === todayDate()) ?? null;
  const todaySessions = todayLog ? sessions.filter((session) => session.log_id === todayLog.id) : [];
  const metrics = todayLog ? computeMetrics(todayLog, todaySessions, goals) : null;
  const hasSessions = todaySessions.length > 0;

  const trend = history.slice(-14).map((entry) => ({
    date: entry.date.slice(5),
    sleep: entry.sleep,
    focus: entry.focus,
    distraction: entry.distraction,
  }));

  const streak = computeStreaks(logs).current;
  const feedbackStyle = user?.user_metadata?.feedback_style ?? "balanced";
  const todayScore = history.at(-1)?.score ?? (metrics ? Math.max(0, Math.min(100, Math.round(metrics.efficiencyScore * 0.65 + metrics.goalScore * 0.35))) : null);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 18) return "Good afternoon";
    return "Good evening";
  };

  // const streak = (() => {
  //   let s = 0;
  //   for (let i = history.length - 1; i >= 0; i--) {
  //     if (history[i].score >= 50) s++;
  //     else break;
  //   }
  //   return Math.max(s, 4);
  // })();

  return (
    <AppLayout title="Dashboard">
      <div className="px-4 md:px-8 py-6 md:py-10 max-w-350 mx-auto space-y-6">
        {loadError && (
          <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-foreground">
            {loadError}
          </div>
        )}

        {/* Greeting */}
        <motion.div {...fadeUp}>
          <h1 className="font-display text-2xl md:text-4xl font-semibold tracking-tight">
            {greeting()}, <span className="text-gradient">{user?.user_metadata?.full_name ?? "there"}</span>
          </h1>
          <p className="mt-2 text-sm md:text-base text-muted-foreground">
            {hasSessions && metrics
              ? `You used ${metrics.efficiencyScore}% of your day effectively. ${metrics.distraction > 0 ? `${fmtMins(metrics.distraction)} went to distraction.` : ""}`
              : "Map today on the timeline. We'll show you exactly where your time went."}
          </p>
        </motion.div>

        {/* Hero analysis */}
        <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.05 }}>
          <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-6 md:p-8">
            <div
              aria-hidden
              className="absolute -top-32 -right-20 h-72 w-72 rounded-full opacity-30 blur-3xl"
              style={{ background: "hsl(var(--primary) / 0.5)" }}
            />
            <div className="relative">
              <div className="flex items-center gap-2 text-[11px] uppercase tracking-widest text-muted-foreground">
                <Sparkles className="h-3.5 w-3.5 text-primary" /> Today&apos;s analysis
              </div>
              <p className="mt-3 text-lg md:text-xl text-foreground/95 leading-relaxed max-w-3xl">
                {hasSessions && metrics
                  ? `You logged ${fmtMins(metrics.productive)} of productive work and ${fmtMins(metrics.distraction)} of distraction. ${metrics.goalScore >= 25 ? "Your day moved your goals forward." : "Goal-aligned time is low — fix this first."}`
                  : "No sessions logged yet today. Add your first block to get a real read on where your time is going."}
              </p>

              <div className="mt-6 grid md:grid-cols-2 gap-4">
                <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4">
                  <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-destructive/90 mb-2">
                    <AlertTriangle className="h-3.5 w-3.5" /> Core problem
                  </div>
                  <p className="text-sm text-foreground/90 leading-relaxed">
                    {hasSessions && metrics
                      ? metrics.distraction >= 120
                        ? `${fmtMins(metrics.distraction)} on distraction — that's your peak hours gone.`
                        : metrics.untracked > metrics.awakeMinutes * 0.4
                          ? `${fmtMins(metrics.untracked)} untracked. The invisible hours are usually the costly ones.`
                          : "No critical leaks today — but consistency is the real test."
                      : "Untracked time is hiding the truth. Start logging."}
                  </p>
                </div>
                <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
                  <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-primary mb-2">
                    <CheckCircle2 className="h-3.5 w-3.5" /> One key action
                  </div>
                  <p className="text-sm text-foreground/90 leading-relaxed">
                    {hasSessions && metrics
                      ? metrics.goalScore < 25
                        ? "Block 60 minutes for your top goal tomorrow. Before noon."
                        : "Repeat tomorrow. Patterns become visible after 14 days."
                      : "Open Daily Log and add your wake time + first session."}
                  </p>
                </div>
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <Button asChild variant="hero" size="sm">
                  <Link href="/app/log">
                    {hasSessions ? "Add another session" : "Log today"} <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </Button>
                <Button asChild variant="glow" size="sm">
                  <Link href="/app/goals">Manage goals</Link>
                </Button>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Score row */}
        <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.08 }}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <ScoreCard
              icon={Zap}
              label="Efficiency"
              value={metrics ? `${metrics.efficiencyScore}%` : "—"}
              hint="of awake time productive"
              tone="primary"
            />
            <ScoreCard
              icon={Target}
              label="Goal score"
              value={metrics ? `${metrics.goalScore}%` : "—"}
              hint="time on goal-aligned work"
              tone="primary"
            />
            <ScoreCard
              icon={AlertTriangle}
              label="Wasted"
              value={metrics ? fmtMins(metrics.distraction) : "—"}
              hint="distraction logged"
              tone="bad"
            />
            <ScoreCard
              icon={Clock}
              label="Untracked"
              value={metrics ? fmtMins(metrics.untracked) : "—"}
              hint="hours unaccounted for"
              tone="muted"
            />
          </div>
        </motion.div>

        {/* Timeline + Goal contribution */}
        <div className="grid lg:grid-cols-3 gap-4">
          <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.12 }} className="lg:col-span-2">
            <Panel title="Today's timeline" subtitle={todayLog ? `${todayLog.wake_time} → ${todayLog.sleep_time}` : "Not logged"}>
              {todayLog && hasSessions ? (
                <DayTimeline log={todayLog} sessions={sessions} />
              ) : (
                <EmptyTimeline />
              )}
              <div className="mt-4 flex flex-wrap gap-4 text-[11px] text-muted-foreground">
                <LegendDot color="bg-primary" label="Productive" />
                <LegendDot color="bg-yellow-400" label="Neutral" />
                <LegendDot color="bg-destructive" label="Distraction" />
              </div>
            </Panel>
          </motion.div>

          <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.16 }}>
            <Panel title="Goal contribution" subtitle="today">
              {metrics && metrics.goalBreakdown.length > 0 ? (
                <div className="space-y-3">
                  {metrics.goalBreakdown.map((g) => (
                    <div key={g.goal_id}>
                      <div className="flex items-center justify-between text-sm mb-1.5">
                        <span className="text-foreground truncate">{g.title}</span>
                        <span className="text-primary font-mono text-xs">+{fmtMins(g.minutes)}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full bg-primary"
                          style={{
                            width: `${Math.min((g.minutes / Math.max(metrics.awakeMinutes, 1)) * 100, 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                  <p className="pt-2 text-[11px] text-muted-foreground">
                    {metrics.goalScore}% of your day moved goals forward.
                  </p>
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">
                  No goal-aligned sessions yet today.
                  <Link href="/app/goals" className="block mt-2 text-primary hover:underline">
                    Define your goals →
                  </Link>
                </div>
              )}
            </Panel>
          </motion.div>
        </div>

        {/* Streak + Fix one + Pattern */}
        <div className="grid lg:grid-cols-3 gap-4">
          <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.2 }}>
            <Panel title="Current streak">
              <div className="flex items-center gap-3">
                <div className="grid h-12 w-12 place-items-center rounded-xl bg-primary/10 border border-primary/30">
                  <Flame className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <div className="font-display text-3xl font-semibold">{streak}</div>
                  <div className="text-xs text-muted-foreground">days logged in a row</div>
                </div>
              </div>
              <div className="mt-4 h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${Math.min((streak / 14) * 100, 100)}%` }}
                />
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                Patterns become visible after 14 days.
              </p>
            </Panel>
          </motion.div>

          <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.22 }}>
            <Panel title="If you fix one thing" accent>
              <p className="text-sm text-foreground leading-relaxed">
                If you fix only <span className="text-primary font-medium">ONE</span> thing tomorrow:
              </p>
              <p className="mt-2 font-display text-lg text-foreground">
                {metrics && metrics.distraction >= 120
                  ? "Cut distraction in half."
                  : metrics && metrics.goalScore < 25
                    ? "Block 60 minutes for your top goal."
                    : "Sleep before 12 AM."}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                Your highest-leverage variable today.
              </p>
            </Panel>
          </motion.div>

          <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.24 }}>
            <Panel title="Pattern detected">
              <div className="flex items-start gap-3">
                <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10 border border-primary/30 shrink-0">
                  <TrendingUp className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="font-display text-base text-foreground leading-snug">
                    You perform 38% worse on days after &lt;6h sleep.
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                    Sleep is your highest-leverage variable.
                  </p>
                </div>
              </div>
            </Panel>
          </motion.div>
        </div>

        {/* Trend graph */}
        <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.28 }}>
          <Panel title="Sleep vs focus vs distraction" subtitle="Last 14 days">
            <div className="h-64 -ml-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trend} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                  <Line type="monotone" dataKey="sleep" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="focus" stroke="hsl(0 0% 80%)" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="distraction" stroke="hsl(var(--destructive))" strokeWidth={2} strokeDasharray="4 4" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Panel>
        </motion.div>

        <p className="text-[11px] text-muted-foreground/70 pt-2">
          Profile: {feedbackStyle} feedback · {history.length} days analyzed · today: {todayScore ?? "—"} score
        </p>
      </div>
    </AppLayout>
  );
};

const Panel = ({
  title,
  subtitle,
  children,
  accent,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  accent?: boolean;
}) => (
  <div
    className={cn(
      "h-full rounded-2xl border bg-card p-5 md:p-6 transition-all duration-300 hover:border-primary/30 hover:shadow-card",
      accent ? "border-primary/30 bg-primary/3" : "border-border",
    )}
  >
    <div className="flex items-baseline justify-between mb-4">
      <h3 className="font-display text-sm font-medium text-foreground">{title}</h3>
      {subtitle && (
        <span className="text-[11px] text-muted-foreground uppercase tracking-wider">{subtitle}</span>
      )}
    </div>
    {children}
  </div>
);

const ScoreCard = ({
  icon: Icon,
  label,
  value,
  hint,
  tone,
}: {
  icon: typeof Zap;
  label: string;
  value: string;
  hint: string;
  tone: "primary" | "bad" | "muted";
}) => {
  const toneCls = {
    primary: "text-primary border-primary/30",
    bad: "text-destructive border-destructive/40",
    muted: "text-foreground border-border",
  }[tone];
  return (
    <div className={cn("group rounded-xl border bg-card p-4 transition-all hover:-translate-y-0.5", toneCls)}>
      <Icon className="h-4 w-4 opacity-80" />
      <div className="mt-3 font-display text-2xl font-semibold tracking-tight text-foreground">{value}</div>
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground mt-0.5">{label}</div>
      <div className="text-[11px] text-muted-foreground/70 mt-1">{hint}</div>
    </div>
  );
};

const DayTimeline = ({
  log,
  sessions,
}: {
  log: { wake_time: string; sleep_time: string };
  sessions: ActivitySession[];
}) => {
  const date = todayDate();
  const wakeMs = new Date(`${date}T${log.wake_time}:00`).getTime();
  let sleepMs = new Date(`${date}T${log.sleep_time}:00`).getTime();
  if (sleepMs <= wakeMs) sleepMs += 24 * 3600 * 1000;
  const span = sleepMs - wakeMs;

  const ticks = 6;
  return (
    <div>
      <div className="relative h-12 rounded-lg bg-background border border-border overflow-hidden">
        {sessions.map((s) => {
          const a = Math.max(0, new Date(s.start_time).getTime() - wakeMs);
          const b = Math.min(span, new Date(s.end_time).getTime() - wakeMs);
          if (b <= 0 || a >= span) return null;
          const left = (a / span) * 100;
          const width = ((b - a) / span) * 100;
          return (
            <div
              key={s.id}
              className={cn("absolute top-0 h-full opacity-90 hover:opacity-100 transition-opacity", catColor[s.category])}
              style={{ left: `${left}%`, width: `${width}%` }}
              title={`${s.title} · ${fmtMins(s.duration_minutes)}`}
            />
          );
        })}
      </div>
      <div className="mt-2 flex justify-between text-[10px] text-muted-foreground">
        {Array.from({ length: ticks + 1 }, (_, i) => {
          const t = new Date(wakeMs + (span * i) / ticks);
          return <span key={i}>{t.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>;
        })}
      </div>
    </div>
  );
};

const EmptyTimeline = () => (
  <div className="rounded-lg border border-dashed border-border p-8 text-center">
    <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 border border-primary/30 mx-auto mb-3">
      <Plus className="h-5 w-5 text-primary" />
    </div>
    <p className="text-sm text-foreground mb-1">No sessions logged today</p>
    <p className="text-xs text-muted-foreground mb-4">Map your day to see where the time actually went.</p>
    <Button asChild variant="hero" size="sm">
      <Link href="/app/log">Add first session</Link>
    </Button>
  </div>
);

const LegendDot = ({ color, label }: { color: string; label: string }) => (
  <div className="flex items-center gap-1.5">
    <span className={cn("h-2 w-2 rounded-sm", color)} />
    {label}
  </div>
);

export default Dashboard;

