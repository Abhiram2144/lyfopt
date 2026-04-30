"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { AppLayout } from "@/components/dashboard/AppLayout";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
// select removed: sessions are auto-categorized via heuristics
import {
  Sparkles,
  Plus,
  Trash2,
  Sun,
  Moon,
  Target,
  Coffee,
  Zap,
  Clock,
} from "lucide-react";
import {
  addSession,
  computeMetrics,
  deleteSession,
  fmtMins,
  getSessionsForLog,
  matchGoalForTitle,
  todayDate,
  upsertLog,
  type ActivitySession,
  type SessionCategory,
} from "@/lib/sessions";
import { cn } from "@/lib/utils";

const categoryStyles: Record<SessionCategory, { dot: string; ring: string; label: string; icon: typeof Target }> = {
  productive: { dot: "bg-primary", ring: "border-primary/30", label: "Productive", icon: Target },
  neutral: { dot: "bg-yellow-400", ring: "border-yellow-400/30", label: "Neutral", icon: Coffee },
  distraction: { dot: "bg-destructive", ring: "border-destructive/40", label: "Distraction", icon: Zap },
};

const toIso = (date: string, time: string) => new Date(`${date}T${time}:00`).toISOString();

const DailyLog = () => {
  const router = useRouter();
  const date = todayDate();
  const [wake, setWake] = useState("07:30");
  const [sleep, setSleep] = useState("23:30");
  const [logId, setLogId] = useState<string>("");

  // Session draft
  const [title, setTitle] = useState("");
  const [start, setStart] = useState("09:00");
  const [end, setEnd] = useState("11:00");

  const [sessions, setSessions] = useState<ActivitySession[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // initialize log row
  useEffect(() => {
    const log = upsertLog({ date, wake_time: wake, sleep_time: sleep });
    setLogId(log.id);
    setSessions(getSessionsForLog(log.id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // keep wake/sleep persisted
  useEffect(() => {
    if (!logId) return;
    upsertLog({ id: logId, date, wake_time: wake, sleep_time: sleep });
  }, [wake, sleep, logId, date]);

  const matched = useMemo(() => (title.trim() ? matchGoalForTitle(title) : null), [title]);

  const addOne = () => {
    if (!title.trim() || !logId) return;
    const startIso = toIso(date, start);
    let endIso = toIso(date, end);
    if (new Date(endIso) <= new Date(startIso)) {
      // assume crosses midnight
      const next = new Date(date);
      next.setDate(next.getDate() + 1);
      endIso = new Date(`${next.toISOString().slice(0, 10)}T${end}:00`).toISOString();
    }
    addSession({
      log_id: logId,
      title: title.trim(),
      start_time: startIso,
      end_time: endIso,
    });
    setSessions(getSessionsForLog(logId));
    setTitle("");
  };

  const remove = (id: string) => {
    deleteSession(id);
    setSessions(getSessionsForLog(id ? logId : logId));
  };

  const metrics = useMemo(
    () => (logId ? computeMetrics({ id: logId, date, wake_time: wake, sleep_time: sleep, created_at: "" }, sessions) : null),
    [sessions, wake, sleep, logId, date],
  );

  const runAnalysis = () => {
    setSubmitting(true);
    sessionStorage.setItem("lyfopt:analyze:logId", logId);
    setTimeout(() => router.push("/app/analysis"), 500);
  };

  return (
    <AppLayout title="Daily log">
      <div className="px-4 md:px-8 py-6 md:py-10 max-w-5xl mx-auto space-y-6">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="font-display text-2xl md:text-3xl font-semibold tracking-tight">
            Map your day
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Log sessions like a calendar. We&apos;ll compute where your time actually went.
          </p>
        </motion.div>

        {/* Wake / Sleep */}
        <div className="rounded-2xl border border-border bg-card p-5 md:p-6 grid sm:grid-cols-2 gap-5">
          <TimeField icon={Sun} label="Wake time" value={wake} onChange={setWake} />
          <TimeField icon={Moon} label="Sleep time" value={sleep} onChange={setSleep} />
        </div>

        {/* Add session */}
        <div className="rounded-2xl border border-border bg-card p-5 md:p-6">
          <div className="flex items-center gap-2 mb-4">
            <Plus className="h-4 w-4 text-primary" />
            <h2 className="font-display text-base font-medium">Add session</h2>
          </div>

          <div className="grid md:grid-cols-12 gap-3">
            <div className="md:col-span-4 space-y-2">
              <Label className="text-xs">Activity</Label>
              <Input
                placeholder="library, football, gaming…"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="bg-background border-border h-10"
              />
              {matched && (
                <p className="text-[11px] text-primary flex items-center gap-1">
                  <Target className="h-3 w-3" /> Linked to: {matched.title}
                </p>
              )}
            </div>
            <div className="md:col-span-2 space-y-2">
              <Label className="text-xs">Start</Label>
              <Input type="time" value={start} onChange={(e) => setStart(e.target.value)} className="bg-background border-border h-10" />
            </div>
            <div className="md:col-span-2 space-y-2">
              <Label className="text-xs">End</Label>
              <Input type="time" value={end} onChange={(e) => setEnd(e.target.value)} className="bg-background border-border h-10" />
            </div>
            {/* Type removed: sessions are auto-categorized */}
            <div className="md:col-span-2 flex items-end">
              <Button onClick={addOne} variant="hero" className="w-full h-10" disabled={!title.trim()}>
                <Plus className="h-4 w-4" /> Add
              </Button>
            </div>
          </div>
        </div>

        {/* Timeline preview */}
        <div className="rounded-2xl border border-border bg-card p-5 md:p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              <h2 className="font-display text-base font-medium">Today&apos;s timeline</h2>
            </div>
            <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
              {sessions.length} session{sessions.length === 1 ? "" : "s"}
            </span>
          </div>

          <TimelineBar wake={wake} sleep={sleep} sessions={sessions} />

          <div className="mt-5 space-y-2">
            <AnimatePresence initial={false}>
              {sessions.length === 0 && (
                <p className="text-sm text-muted-foreground py-6 text-center">
                  No sessions yet. Start by adding your first block above.
                </p>
              )}
              {sessions.map((s) => {
                const cat = categoryStyles[s.category];
                const Icon = cat.icon;
                const goal = matchGoalForTitle(s.title);
                return (
                  <motion.div
                    key={s.id}
                    layout
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className={cn("flex items-center gap-3 rounded-xl border bg-background/40 px-4 py-3", cat.ring)}
                  >
                    <span className={cn("h-2 w-2 rounded-full", cat.dot)} />
                    <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-foreground capitalize truncate">{s.title}</div>
                      <div className="text-[11px] text-muted-foreground">
                        {new Date(s.start_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} –{" "}
                        {new Date(s.end_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        {goal && <span className="ml-2 text-primary">· {goal.title}</span>}
                      </div>
                    </div>
                    <span className="text-xs font-mono text-foreground/80">{fmtMins(s.duration_minutes)}</span>
                    <button
                      onClick={() => remove(s.id)}
                      className="text-muted-foreground hover:text-destructive transition-colors"
                      aria-label="Delete session"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>

        {/* Live metrics */}
        {metrics && sessions.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Stat label="Productive" value={fmtMins(metrics.productive)} accent="text-primary" />
            <Stat label="Distraction" value={fmtMins(metrics.distraction)} accent="text-destructive" />
            <Stat label="Wasted" value={fmtMins(metrics.untracked)} accent="text-muted-foreground" />
            <Stat label="Goal score" value={`${metrics.goalScore}%`} accent="text-primary" />
          </div>
        )}

        <Button
          onClick={runAnalysis}
          variant="hero"
          size="lg"
          className="w-full"
          disabled={submitting || sessions.length === 0}
        >
          <Sparkles className="h-4 w-4" />
          {submitting ? "Sending to AI..." : "Run analysis"}
        </Button>
      </div>
    </AppLayout>
  );
};

const TimeField = ({
  icon: Icon,
  label,
  value,
  onChange,
}: {
  icon: typeof Sun;
  label: string;
  value: string;
  onChange: (v: string) => void;
}) => (
  <div className="space-y-2">
    <Label className="text-xs flex items-center gap-1.5">
      <Icon className="h-3.5 w-3.5 text-primary" /> {label}
    </Label>
    <Input
      type="time"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="bg-background border-border h-11"
    />
  </div>
);

const Stat = ({ label, value, accent }: { label: string; value: string; accent: string }) => (
  <div className="rounded-xl border border-border bg-card p-4">
    <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
    <div className={cn("mt-1 font-display text-xl font-semibold", accent)}>{value}</div>
  </div>
);

const TimelineBar = ({
  wake,
  sleep,
  sessions,
}: {
  wake: string;
  sleep: string;
  sessions: ActivitySession[];
}) => {
  const date = todayDate();
  const wakeMs = new Date(`${date}T${wake}:00`).getTime();
  let sleepMs = new Date(`${date}T${sleep}:00`).getTime();
  if (sleepMs <= wakeMs) sleepMs += 24 * 3600 * 1000;
  const span = sleepMs - wakeMs;

  return (
    <div className="relative">
      <div className="relative h-10 rounded-lg bg-background border border-border overflow-hidden">
        {sessions.map((s) => {
          const a = Math.max(0, new Date(s.start_time).getTime() - wakeMs);
          const b = Math.min(span, new Date(s.end_time).getTime() - wakeMs);
          if (b <= 0 || a >= span) return null;
          const left = (a / span) * 100;
          const width = ((b - a) / span) * 100;
          const cat = categoryStyles[s.category];
          return (
            <div
              key={s.id}
              className={cn("absolute top-0 h-full opacity-90 hover:opacity-100 transition-opacity", cat.dot)}
              style={{ left: `${left}%`, width: `${width}%` }}
              title={`${s.title} · ${fmtMins(s.duration_minutes)}`}
            />
          );
        })}
      </div>
      <div className="mt-1.5 flex justify-between text-[10px] text-muted-foreground">
        <span>{wake}</span>
        <span>{sleep}</span>
      </div>
    </div>
  );
};

export default DailyLog;

