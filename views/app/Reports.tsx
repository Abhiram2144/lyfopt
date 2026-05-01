"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { AppLayout } from "@/components/dashboard/AppLayout";
import { useAuth } from "@/components/site/AuthProvider";
import {
  buildHistoryFromDb,
  fetchDailyLogsFromDb,
  fetchGoalsFromDb,
  fetchSessionsFromDb,
  weeklyFromHistory,
  type ActivitySession,
  type DailyLog,
  type Goal,
} from "@/lib/sessions";
import { AlertTriangle, CheckCircle2, Sparkles, FileBarChart } from "lucide-react";
import { getErrorMessage } from "@/lib/error";

const Reports = () => {
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

  const w = useMemo(() => weeklyFromHistory(buildHistoryFromDb(logs, sessions, goals)), [logs, sessions, goals]);

  return (
    <AppLayout title="Reports">
      <div className="px-4 md:px-8 py-6 md:py-10 max-w-3xl mx-auto space-y-6">
        {loadError && (
          <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-foreground">
            {loadError}
          </div>
        )}

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-widest text-muted-foreground">
            <FileBarChart className="h-3.5 w-3.5 text-primary" /> Weekly review
          </div>
          <h1 className="mt-2 font-display text-2xl md:text-3xl font-semibold">
            This week, in one read.
          </h1>
        </motion.div>

        <div className="rounded-2xl border border-border bg-card p-6 md:p-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Stat label="Score" value={`${w.avgScore}`} suffix="/100" />
            <Stat label="Avg sleep" value={`${w.avgSleep}`} suffix="h" />
            <Stat label="Avg focus" value={`${w.avgFocus}`} suffix="h" />
            <Stat label="Avg distraction" value={`${w.avgDistraction}`} suffix="h" />
          </div>

          <div className="mt-8 grid md:grid-cols-2 gap-4">
            <Section
              tone="bad"
              icon={<AlertTriangle className="h-4 w-4" />}
              title="Key problems"
              items={[
                `Distraction averaged ${w.avgDistraction}h this week.`,
                `Average score is ${w.avgScore}/100 across the last 7 logged days.`,
                w.avgFocus > 0
                  ? `Focus averaged ${w.avgFocus}h, so your strongest lever is how you protect those blocks.`
                  : "There was too little logged focus time to find a stable pattern yet.",
              ]}
            />
            <Section
              tone="good"
              icon={<CheckCircle2 className="h-4 w-4" />}
              title="Improvements"
              items={[
                w.avgScore >= 60 ? "Your logged days are trending stronger than last week." : "Your strongest opportunity is making the day more consistent.",
                w.avgSleep >= 7 ? "Sleep is supporting your output." : "Sleep is still under the threshold that makes the rest easier.",
                "The next gain will come from reducing the biggest recurring leak, not adding more tasks.",
              ]}
            />
          </div>

          <div className="mt-6 rounded-xl border border-primary/30 bg-primary/5 p-5">
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-primary mb-2">
              <Sparkles className="h-3.5 w-3.5" /> AI recommendation
            </div>
            <p className="text-sm text-foreground/90 leading-relaxed">
              {w.avgScore >= 60
                ? "Keep the current rhythm and protect your best hours with one deeper block each day."
                : "Shrink the week to one priority, one focus block, and one boundary around distraction."}
            </p>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

const Stat = ({ label, value, suffix }: { label: string; value: string; suffix?: string }) => (
  <div className="rounded-xl border border-border bg-background/40 p-4">
    <div className="font-display text-2xl font-semibold">
      {value}
      <span className="text-sm font-normal text-muted-foreground">{suffix}</span>
    </div>
    <div className="text-[11px] text-muted-foreground uppercase tracking-wider mt-1">{label}</div>
  </div>
);

const Section = ({
  tone,
  icon,
  title,
  items,
}: {
  tone: "good" | "bad";
  icon: React.ReactNode;
  title: string;
  items: string[];
}) => (
  <div
    className={`rounded-xl border p-5 ${
      tone === "good" ? "border-primary/30 bg-primary/5" : "border-destructive/30 bg-destructive/5"
    }`}
  >
    <div
      className={`flex items-center gap-2 text-xs uppercase tracking-wider mb-3 ${
        tone === "good" ? "text-primary" : "text-destructive"
      }`}
    >
      {icon} {title}
    </div>
    <ul className="space-y-2">
      {items.map((t, i) => (
        <li key={i} className="flex items-start gap-2 text-sm text-foreground/90">
          <span
            className={`mt-1 h-1 w-1 rounded-full shrink-0 ${
              tone === "good" ? "bg-primary" : "bg-destructive"
            }`}
          />
          <span className="leading-relaxed">{t}</span>
        </li>
      ))}
    </ul>
  </div>
);

export default Reports;

