"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { AppLayout } from "@/components/dashboard/AppLayout";
import { useAuth } from "@/components/site/AuthProvider";
import {
  buildHistoryFromDb,
  fetchDailyLogsFromDb,
  fetchGoalsFromDb,
  fetchSessionsFromDb,
  type DbHistoryEntry,
  type DailyLog,
  type Goal,
  type ActivitySession,
} from "@/lib/sessions";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { getErrorMessage } from "@/lib/error";

const History = () => {
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

  const history = useMemo(() => buildHistoryFromDb(logs, sessions, goals).slice().reverse(), [logs, sessions, goals]);

  return (
    <AppLayout title="History">
      <div className="px-4 md:px-8 py-6 md:py-10 max-w-3xl mx-auto">
        {loadError && (
          <div className="mb-6 rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-foreground">
            {loadError}
          </div>
        )}

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="font-display text-2xl md:text-3xl font-semibold">History</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Every logged day. Click one to revisit the full analysis.
          </p>
        </motion.div>

        <div className="mt-8 rounded-2xl border border-border bg-card overflow-hidden">
          {history.map((d: DbHistoryEntry, i) => {
            const status = d.score >= 65 ? "good" : d.score >= 40 ? "ok" : "bad";
            return (
              <Link
                key={d.date}
                href="/app/analysis"
                onClick={() => sessionStorage.setItem("lyfopt:analyze:logId", d.log_id)}
                className={cn(
                  "flex items-center gap-4 px-5 py-4 hover:bg-background/40 transition-colors group",
                  i !== 0 && "border-t border-border",
                )}
              >
                <span
                  className={cn(
                    "h-2 w-2 rounded-full shrink-0",
                    status === "good" && "bg-primary",
                    status === "ok" && "bg-yellow-400",
                    status === "bad" && "bg-destructive",
                  )}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-3">
                    <div className="font-mono text-sm text-foreground">{d.date}</div>
                    <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                      Score {d.score}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 truncate">{d.summary}</p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </Link>
            );
          })}
        </div>
      </div>
    </AppLayout>
  );
};

export default History;

