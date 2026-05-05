"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useAuth } from "@/components/site/AuthProvider";
import {
  buildHistoryFromDb,
  fetchDailyLogsFromDb,
  fetchGoalsFromDb,
  fetchSessionsFromDb,
  type ActivitySession,
  type DailyLog,
  type Goal,
} from "@/lib/sessions";
import { Lightbulb, TrendingUp, TrendingDown } from "lucide-react";
import { getErrorMessage } from "@/lib/error";

const Insights = () => {
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
        setLoadError(getErrorMessage(error));
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, [loading, user]);

  const history = useMemo(() => buildHistoryFromDb(logs, sessions, goals).slice(-30), [logs, sessions, goals]);
  const data = history.map((d) => ({
    date: d.date.slice(5),
    score: d.score,
    sleep: d.sleep,
  }));

  const insights = useMemo(() => {
    const strongDays = history.filter((d) => d.sleep >= 7);
    const weakDays = history.filter((d) => d.sleep < 7);
    const avg = (items: typeof history) =>
      items.length ? Math.round(items.reduce((sum, item) => sum + item.score, 0) / items.length) : 0;
    const best = history.slice().sort((a, b) => b.score - a.score)[0];
    const worst = history.slice().sort((a, b) => a.score - b.score)[0];
    const firstHalf = history.slice(0, Math.floor(history.length / 2));
    const secondHalf = history.slice(Math.floor(history.length / 2));

    return [
      {
        icon: TrendingUp,
        tone: "good" as const,
        text: strongDays.length
          ? `When sleep stayed at ${strongDays[0].sleep}h or above, your average score rose to ${avg(strongDays)}/100.`
          : "You do not yet have enough sleep data to isolate a reliable pattern.",
      },
      {
        icon: TrendingDown,
        tone: "bad" as const,
        text: worst
          ? `Your weakest logged day was ${worst.date} with a score of ${worst.score}. The leak was likely distraction and recovery.`
          : "No weak-day pattern yet because there are not enough logged days.",
      },
      {
        icon: Lightbulb,
        tone: "neutral" as const,
        text: firstHalf.length && secondHalf.length
          ? `The second half of the month is ${avg(secondHalf) >= avg(firstHalf) ? "stronger" : "weaker"} than the first half by ${Math.abs(avg(secondHalf) - avg(firstHalf))} points.`
          : "Keep logging more days and the weekly trend will become obvious.",
      },
      {
        icon: TrendingUp,
        tone: "good" as const,
        text: best
          ? `Your strongest day was ${best.date} with a score of ${best.score}. That is the model to repeat, not the exception to admire.`
          : "A best-day pattern will appear after a few more logs.",
      },
    ];
  }, [history]);

  return (
    <>
      <div className="px-4 md:px-8 py-6 md:py-10 max-w-300 mx-auto space-y-6">
        {loadError && (
          <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-foreground">
            {loadError}
          </div>
        )}

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="font-display text-2xl md:text-3xl font-semibold">Long-term patterns</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            What your last 30 days reveal about how you actually operate.
          </p>
        </motion.div>

        <div className="rounded-2xl border border-border bg-card p-5 md:p-6">
          <div className="flex items-baseline justify-between mb-4">
            <h3 className="font-display text-sm font-medium">Daily score trend</h3>
            <span className="text-[11px] text-muted-foreground uppercase tracking-wider">
              30 days
            </span>
          </div>
          <div className="h-72 -ml-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data}>
                <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="date"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="score" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          {insights.map((it, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="rounded-2xl border border-border bg-card p-5 hover:border-primary/30 transition-colors"
            >
              <div className="flex items-start gap-3">
                <div
                  className={`grid h-9 w-9 place-items-center rounded-lg border shrink-0 ${
                    it.tone === "good"
                      ? "bg-primary/10 border-primary/30 text-primary"
                      : it.tone === "bad"
                        ? "bg-destructive/10 border-destructive/30 text-destructive"
                        : "bg-muted border-border text-foreground"
                  }`}
                >
                  <it.icon className="h-4 w-4" />
                </div>
                <p className="text-sm text-foreground/90 leading-relaxed">{it.text}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </>
  );
};

export default Insights;

