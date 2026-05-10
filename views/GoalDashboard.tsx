"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Flame, TrendingUp, Plus, AlertTriangle, FolderKanban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/site/AuthProvider";
import {
  buildHistoryFromDb,
  computeMetrics,
  computeStreaks,
  fetchDailyAnalysisForLogFromDb,
  fetchDailyLogsFromDb,
  fetchGoalsFromDb,
  fetchSessionsFromDb,
  fmtMins,
  matchGoalForTitle,
  todayDate,
  type ActivitySession,
  type DailyAnalysis,
  type DailyLog,
  type Goal,
} from "@/lib/sessions";

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] as const },
};

const goalColor = (score: number) => {
  if (score >= 80) return "bg-emerald-500";
  if (score >= 55) return "bg-emerald-400";
  if (score >= 30) return "bg-amber-400";
  return "bg-zinc-400";
};

const ringStyle = (score: number) => ({
  background: `conic-gradient(hsl(var(--primary)) ${score * 3.6}deg, hsl(var(--muted)) 0deg)`,
});

export default function GoalDashboard() {
  const { user, loading } = useAuth();
  const [logs, setLogs] = useState<DailyLog[]>([]);
  const [sessions, setSessions] = useState<ActivitySession[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [aiInsight, setAiInsight] = useState<DailyAnalysis | null>(null);

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
        const today = loadedLogs.find((entry) => entry.date === todayDate()) ?? null;
        const analysis = today ? await fetchDailyAnalysisForLogFromDb(today.id) : null;
        if (!active) return;
        setAiInsight(analysis);
      } catch (error) {
        if (!active) return;
        setLoadError(error instanceof Error ? error.message : "Unable to load the dashboard.");
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, [loading, user]);

  const history = useMemo(() => buildHistoryFromDb(logs, sessions, goals), [logs, sessions, goals]);
  const todayLog = logs.find((entry) => entry.date === todayDate()) ?? null;
  const todaySessions = useMemo(
    () => (todayLog ? sessions.filter((session) => session.log_id === todayLog.id) : []),
    [sessions, todayLog],
  );
  const metrics = todayLog ? computeMetrics(todayLog, todaySessions, goals) : null;
  const streaks = computeStreaks(logs);

  const todayAlignment = metrics?.goalScore ?? 0;
  const topGoal = metrics?.goalBreakdown.slice().sort((a, b) => b.minutes - a.minutes)[0] ?? null;
  const unalignedActivities = todaySessions
    .filter((session) => !matchGoalForTitle(session.title, goals))
    .sort((a, b) => b.duration_minutes - a.duration_minutes)
    .slice(0, 3);

  const weeklyDays = history.slice(-7);
  const weeklyAverage = weeklyDays.length
    ? Math.round(weeklyDays.reduce((sum, entry) => sum + entry.score, 0) / weeklyDays.length)
    : 0;
  const trendDirection = weeklyDays.length >= 2 && weeklyDays.at(-1) && weeklyDays.at(0)
    ? weeklyDays.at(-1)!.score >= weeklyDays.at(0)!.score
      ? "up"
      : "down"
    : "flat";

  const topGoalWeeklyAverage = (() => {
    if (!topGoal) return 0;
    const lastSeven = history.slice(-7);
    const goalTotals = lastSeven.map((entry) => {
      const dayLog = logs.find((log) => log.date === entry.date);
      if (!dayLog) return 0;
      const daySessions = sessions.filter((session) => session.log_id === dayLog.id);
      const dayMetrics = computeMetrics(dayLog, daySessions, goals);
      return dayMetrics.goalBreakdown.find((goal) => goal.goal_id === topGoal.goal_id)?.minutes ?? 0;
    });
    return Math.round(goalTotals.reduce((sum, minutes) => sum + minutes, 0) / Math.max(goalTotals.length, 1));
  })();
  const topGoalDelta = topGoal ? topGoal.minutes - topGoalWeeklyAverage : 0;

  const heatmapDays = history.slice(-28);
  const alignmentHeat = heatmapDays.map((entry) => ({
    date: entry.date,
    value: entry.score,
  }));
  const goalProgress = useMemo(() => {
    const totals = new Map<string, { goal_id: string; title: string; totalMinutes: number; todayMinutes: number; sessionsCount: number }>();

    for (const goal of goals) {
      totals.set(goal.id, {
        goal_id: goal.id,
        title: goal.title,
        totalMinutes: 0,
        todayMinutes: 0,
        sessionsCount: 0,
      });
    }

    for (const session of sessions) {
      const matchedGoal = matchGoalForTitle(session.title, goals);
      if (!matchedGoal) continue;
      const current = totals.get(matchedGoal.id);
      if (!current) continue;
      current.totalMinutes += session.duration_minutes;
      current.sessionsCount += 1;
      if (todayLog && session.log_id === todayLog.id) {
        current.todayMinutes += session.duration_minutes;
      }
    }

    const all = Array.from(totals.values()).sort((a, b) => b.totalMinutes - a.totalMinutes);
    const maxMinutes = all[0]?.totalMinutes ?? 0;

    return all.map((goal) => ({
      ...goal,
      width: maxMinutes > 0 ? Math.max(8, Math.round((goal.totalMinutes / maxMinutes) * 100)) : 0,
    }));
  }, [goals, sessions, todayLog]);

  return (
    <div className="px-4 md:px-8 py-6 md:py-10 max-w-7xl mx-auto space-y-6">
      {loadError && (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-foreground">
          {loadError}
        </div>
      )}

      <motion.div {...fadeUp} className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Goal alignment</p>
          <h1 className="mt-2 font-display text-3xl md:text-5xl font-semibold tracking-tight">
            {user?.user_metadata?.full_name ?? "Your"} day, in goals.
          </h1>
          <p className="mt-3 max-w-2xl text-sm md:text-base text-muted-foreground">
            See whether today moved you closer to what matters. No clutter, just contribution.
          </p>
        </div>
        <div className="flex gap-3">
          <Button asChild variant="hero">
            <Link href="/app/log">Log session <ArrowRight className="h-4 w-4" /></Link>
          </Button>
          <Button asChild variant="glow">
            <Link href="/app/goals">Goals</Link>
          </Button>
        </div>
      </motion.div>

      <div className="grid xl:grid-cols-[1.2fr_0.8fr] gap-6 items-stretch">
        <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.05 }}>
          <div className="rounded-3xl border border-border bg-card p-5 md:p-7 shadow-sm h-full">
            <div className="flex items-start justify-between gap-4 mb-6">
              <div>
                <div className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Today&apos;s alignment</div>
                <div className="mt-2 flex items-end gap-3">
                  <div className="font-display text-5xl md:text-7xl font-semibold tracking-tight">{todayAlignment}%</div>
                  <div className={cn("mb-2 inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium", trendDirection === "up" ? "bg-emerald-500/10 text-emerald-500" : trendDirection === "down" ? "bg-amber-500/10 text-amber-500" : "bg-muted text-muted-foreground") }>
                    {trendDirection === "up" ? "Improving" : trendDirection === "down" ? "Declining" : "Stable"}
                  </div>
                </div>
                <p className="mt-3 max-w-xl text-sm text-muted-foreground">
                  {metrics ? `${fmtMins(metrics.goalScore ? Math.round((metrics.goalScore / 100) * metrics.awakeMinutes) : 0)} contributed toward goals out of ${fmtMins(metrics.awakeMinutes)} awake time.` : "Log today to see alignment."}
                </p>
              </div>

              <div className="flex flex-col items-center gap-2 shrink-0">
                <div className="relative grid h-32 w-32 place-items-center rounded-full p-2" style={ringStyle(todayAlignment)}>
                  <div className="grid h-24 w-24 place-items-center rounded-full bg-card border border-border">
                    <div className="text-center">
                      <div className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">Aligned</div>
                      <div className="font-display text-2xl font-semibold">{todayAlignment}%</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <InfoCard
                label="Top goal today"
                value={topGoal?.title ?? "None yet"}
                subvalue={topGoal ? `${fmtMins(topGoal.minutes)} contributed · ${topGoalDelta >= 0 ? "+" : ""}${fmtMins(Math.abs(topGoalDelta))} vs weekly avg` : "Add goal-linked work"}
                accent
              />
              <InfoCard
                  label="AI observation"
                  value={aiInsight?.summary ?? "Run today’s analysis from the daily log"}
                  subvalue={aiInsight?.contribution_levels?.[0] ?? "Saved after your daily check-in"}
                  tone="warn"
              />
            </div>
          </div>
        </motion.div>

        <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.08 }} className="space-y-6">
          <div className="rounded-3xl border border-border bg-card p-5 md:p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-lg font-semibold">Goal contribution</h2>
              <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Today</span>
            </div>
            <div className="space-y-4">
              {(metrics?.goalBreakdown ?? []).length > 0 ? (
                metrics!.goalBreakdown
                  .slice()
                  .sort((a, b) => b.minutes - a.minutes)
                  .map((goal) => {
                    const width = Math.min((goal.minutes / Math.max(metrics?.awakeMinutes ?? 1, 1)) * 100, 100);
                    return (
                      <div key={goal.goal_id}>
                        <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
                          <span className="truncate text-foreground">{goal.title}</span>
                          <span className="font-mono text-xs text-muted-foreground">{fmtMins(goal.minutes)}</span>
                        </div>
                        <div className="h-2 rounded-full bg-muted overflow-hidden">
                          <div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(width, 4)}%` }} />
                        </div>
                      </div>
                    );
                  })
              ) : (
                <div className="rounded-2xl border border-dashed border-border p-5 text-sm text-muted-foreground">
                  No goal-contributing work yet. Log a task with a matching goal keyword.
                </div>
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-border bg-card p-5 md:p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-lg font-semibold">Goal progress so far</h2>
              <FolderKanban className="h-4 w-4 text-muted-foreground" />
            </div>
            {goalProgress.length > 0 ? (
              <div className="space-y-4">
                {goalProgress.map((goal) => (
                  <div key={goal.goal_id} className="rounded-2xl border border-border bg-muted/20 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-foreground">{goal.title}</div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          {fmtMins(goal.totalMinutes)} total contribution
                          {goal.todayMinutes > 0 ? ` · ${fmtMins(goal.todayMinutes)} today` : " · nothing logged today"}
                        </div>
                      </div>
                      <div className="text-right text-xs text-muted-foreground">
                        <div>{goal.sessionsCount} session{goal.sessionsCount === 1 ? "" : "s"}</div>
                      </div>
                    </div>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-border/60">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${goal.width}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-border p-5 text-sm text-muted-foreground">
                No goal-linked sessions yet. Once activities match your goal keywords, they’ll show up here.
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <StatCard icon={Flame} label="Streak" value={`${streaks.current} days`} sublabel="goal logs in a row" />
            <StatCard icon={TrendingUp} label="7-day avg" value={`${weeklyAverage}%`} sublabel="alignment trend" />
          </div>
        </motion.div>
      </div>

      <div className="grid xl:grid-cols-[1fr_0.8fr] gap-6">
        <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.12 }} className="rounded-3xl border border-border bg-card p-5 md:p-6 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="font-display text-lg font-semibold">Daily timeline</h2>
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Aligned / Neutral / Unaligned</p>
            </div>
            <div className="text-xs text-muted-foreground">{todayLog ? `${todayLog.wake_time} → ${todayLog.sleep_time}` : "No log"}</div>
          </div>
          {todayLog && todaySessions.length > 0 ? (
            <Timeline log={todayLog} sessions={todaySessions} goals={goals} />
          ) : (
            <EmptyState icon={Plus} title="No sessions logged" copy="Add your first task to see the day map." actionHref="/app/log" actionLabel="Log session" />
          )}
          <div className="mt-4 flex flex-wrap gap-4 text-xs text-muted-foreground">
            <LegendDot color="bg-primary" label="Aligned" />
            <LegendDot color="bg-zinc-400" label="Neutral" />
            <LegendDot color="bg-destructive" label="Unaligned" />
          </div>
        </motion.div>

        <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.16 }} className="space-y-6">
          <div className="rounded-3xl border border-border bg-card p-5 md:p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-lg font-semibold">Weekly heatmap</h2>
              <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">28 days</span>
            </div>
            <Heatmap days={alignmentHeat} />
          </div>

          <div className="rounded-3xl border border-border bg-card p-5 md:p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-lg font-semibold">Unaligned activities</h2>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </div>
            {unalignedActivities.length ? (
              <div className="space-y-3">
                {unalignedActivities.map((session) => (
                  <div key={session.id} className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-muted/20 px-4 py-3">
                    <div>
                      <div className="text-sm font-medium text-foreground">{session.title}</div>
                      <div className="text-xs text-muted-foreground">{session.start_time.slice(11, 16)} · {matchGoalForTitle(session.title, goals) ? "aligned" : "not tied to a goal"}</div>
                    </div>
                    <div className="text-sm font-mono text-muted-foreground">{fmtMins(session.duration_minutes)}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-border p-5 text-sm text-muted-foreground">
                No unaligned time shown for today.
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function InfoCard({
  label,
  value,
  subvalue,
  accent,
  tone,
}: {
  label: string;
  value: string;
  subvalue: string;
  accent?: boolean;
  tone?: "warn";
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border p-4",
        accent ? "border-primary/25 bg-primary/5" : "border-border bg-background",
        tone === "warn" && "border-amber-500/25 bg-amber-500/5",
      )}
    >
      <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">{label}</div>
      <div className="mt-2 font-display text-2xl font-semibold leading-tight">{value}</div>
      <div className="mt-1 text-xs text-muted-foreground line-clamp-2">{subvalue}</div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, sublabel }: { icon: typeof Flame; label: string; value: string; sublabel: string }) {
  return (
    <div className="rounded-3xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">{label}</div>
          <div className="mt-2 font-display text-2xl font-semibold">{value}</div>
          <div className="mt-1 text-xs text-muted-foreground">{sublabel}</div>
        </div>
        <div className="grid h-10 w-10 place-items-center rounded-2xl border border-border bg-muted/40">
          <Icon className="h-4 w-4 text-primary" />
        </div>
      </div>
    </div>
  );
}

function Timeline({
  log,
  sessions,
  goals,
}: {
  log: { wake_time: string; sleep_time: string };
  sessions: ActivitySession[];
  goals: Goal[];
}) {
  const date = todayDate();
  const wakeMs = new Date(`${date}T${log.wake_time}:00`).getTime();
  let sleepMs = new Date(`${date}T${log.sleep_time}:00`).getTime();
  if (sleepMs <= wakeMs) sleepMs += 24 * 3600 * 1000;
  const span = sleepMs - wakeMs;

  return (
    <div>
      <div className="relative h-16 overflow-hidden rounded-2xl border border-border bg-background">
        {sessions.map((session) => {
          const sessionStart = new Date(session.start_time).getTime();
          const sessionEnd = new Date(session.end_time).getTime();
          const left = Math.max(0, ((sessionStart - wakeMs) / span) * 100);
          const width = Math.max(0, ((Math.min(sessionEnd, sleepMs) - Math.max(sessionStart, wakeMs)) / span) * 100);
          const aligned = !!matchGoalForTitle(session.title, goals);
          return (
            <div
              key={session.id}
              className={cn("absolute top-0 h-full opacity-90", aligned ? "bg-primary" : session.category === "neutral" ? "bg-zinc-400" : "bg-destructive")}
              style={{ left: `${left}%`, width: `${Math.max(width, 1)}%` }}
              title={`${session.title} · ${fmtMins(session.duration_minutes)}`}
            />
          );
        })}
      </div>
      <div className="mt-2 flex justify-between text-[10px] text-muted-foreground">
        {Array.from({ length: 7 }, (_, index) => {
          const stamp = new Date(wakeMs + (span * index) / 6);
          return <span key={index}>{stamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>;
        })}
      </div>
    </div>
  );
}

function Heatmap({ days }: { days: { date: string; value: number }[] }) {
  const padded = Array.from({ length: Math.max(28 - days.length, 0) }, (_, index) => ({ date: `pad-${index}`, value: 0 })).concat(days);
  return (
    <div className="grid grid-cols-7 gap-2">
      {padded.slice(-28).map((day) => (
        <div
          key={day.date}
          title={`${day.date}: ${day.value}% aligned`}
          className={cn("aspect-square rounded-lg border border-border", goalColor(day.value))}
          style={{ opacity: day.value ? 0.3 + day.value / 150 : 0.12 }}
        />
      ))}
    </div>
  );
}

function EmptyState({
  icon: Icon,
  title,
  copy,
  actionHref,
  actionLabel,
}: {
  icon: typeof Plus;
  title: string;
  copy: string;
  actionHref: string;
  actionLabel: string;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-border p-8 text-center">
      <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl border border-border bg-muted/40">
        <Icon className="h-5 w-5 text-primary" />
      </div>
      <div className="mt-4 font-medium text-foreground">{title}</div>
      <p className="mt-2 text-sm text-muted-foreground">{copy}</p>
      <div className="mt-4">
        <Button asChild variant="hero" size="sm">
          <Link href={actionHref}>{actionLabel}</Link>
        </Button>
      </div>
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className={cn("h-2.5 w-2.5 rounded-full", color)} />
      <span>{label}</span>
    </div>
  );
}
