"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/components/site/AuthProvider";
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
  addSessionToDb,
  computeMetrics,
  deleteSessionFromDb,
  fetchDailyLogByDateFromDb,
  fetchDailyAnalysisForLogFromDb,
  fetchGoalsFromDb,
  fetchSessionsFromDb,
  fmtMins,
  matchGoalForTitle,
  saveDailyAnalysisToDb,
  todayDate,
  upsertDailyLogToDb,
  type ActivitySession,
  type DailyAnalysis,
  type Goal,
  type SessionCategory,
} from "@/lib/sessions";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/error";
import type { AnalyzeDayPayload, AnalyzeDayResult } from "@/lib/ai";

const categoryStyles: Record<SessionCategory, { dot: string; ring: string; label: string; icon: typeof Target }> = {
  productive: { dot: "bg-primary", ring: "border-primary/30", label: "Productive", icon: Target },
  neutral: { dot: "bg-yellow-400", ring: "border-yellow-400/30", label: "Neutral", icon: Coffee },
  distraction: { dot: "bg-destructive", ring: "border-destructive/40", label: "Distraction", icon: Zap },
};

const toIso = (date: string, time: string) => new Date(`${date}T${time}:00`).toISOString();

const pad = (value: number) => value.toString().padStart(2, "0");

const nowTimeValue = () => {
  const now = new Date();
  return `${pad(now.getHours())}:${pad(now.getMinutes())}`;
};

const DEFAULT_WAKE_TIME = "07:30";
const DEFAULT_SLEEP_TIME = "23:30";
const DEFAULT_ENERGY_LEVEL: 1 | 2 | 3 | 4 | 5 = 3;
const DEFAULT_FOCUS_LEVEL: 1 | 2 | 3 | 4 | 5 = 3;
const DEFAULT_MOOD: "low" | "neutral" | "good" = "neutral";
const DEFAULT_DAY_RATING: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 = 7;

const addMinutesToTime = (time: string, minutes: number) => {
  const [hours, mins] = time.split(":").map(Number);
  const next = new Date();
  next.setHours(hours, mins + minutes, 0, 0);
  return `${pad(next.getHours())}:${pad(next.getMinutes())}`;
};

const DailyLog = () => {
  const router = useRouter();
  const { user, loading } = useAuth();
  const date = todayDate();
  const [wake, setWake] = useState(DEFAULT_WAKE_TIME);
  const [sleep, setSleep] = useState(DEFAULT_SLEEP_TIME);
  const [logId, setLogId] = useState<string>("");
  const [energy, setEnergy] = useState<1 | 2 | 3 | 4 | 5>(DEFAULT_ENERGY_LEVEL);
  const [focus, setFocus] = useState<1 | 2 | 3 | 4 | 5>(DEFAULT_FOCUS_LEVEL);
  const [mood, setMood] = useState<"low" | "neutral" | "good">(DEFAULT_MOOD);
  const [dayRating, setDayRating] = useState<1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10>(DEFAULT_DAY_RATING);

  // Session draft
  const [title, setTitle] = useState("");
  const [start, setStart] = useState(nowTimeValue());
  const [end, setEnd] = useState(addMinutesToTime(nowTimeValue(), 60));
  const [intentional, setIntentional] = useState(true);
  const [difficulty, setDifficulty] = useState<1 | 2 | 3 | 4 | 5>(3);

  const [sessions, setSessions] = useState<ActivitySession[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [existingAnalysis, setExistingAnalysis] = useState<DailyAnalysis | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const load = async () => {
      if (loading || !user) return;

      try {
        const [loadedGoals, existingLog] = await Promise.all([fetchGoalsFromDb(), fetchDailyLogByDateFromDb(date)]);
        const log = existingLog ?? (await upsertDailyLogToDb({
          date,
          wake_time: DEFAULT_WAKE_TIME,
          sleep_time: DEFAULT_SLEEP_TIME,
          energy_level: DEFAULT_ENERGY_LEVEL,
          focus_level: DEFAULT_FOCUS_LEVEL,
          mood: DEFAULT_MOOD,
          day_rating: DEFAULT_DAY_RATING,
        }));
        const loadedSessions = await fetchSessionsFromDb(log.id);

        if (!active) return;
        setGoals(loadedGoals);
        setLogId(log.id);
        setWake(log.wake_time);
        setSleep(log.sleep_time);
        setEnergy(log.energy_level);
        setFocus(log.focus_level);
        setMood(log.mood);
        setDayRating(log.day_rating);
        setSessions(loadedSessions);
        setExistingAnalysis(await fetchDailyAnalysisForLogFromDb(log.id));
      } catch (error) {
        if (!active) return;
        setLoadError(getErrorMessage(error));
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, [date, loading, user]);

  useEffect(() => {
    if (!logId) return;
    void upsertDailyLogToDb({
      id: logId,
      date,
      wake_time: wake,
      sleep_time: sleep,
      energy_level: energy,
      focus_level: focus,
      mood,
      day_rating: dayRating,
    }).catch((error) => {
      toast.error(getErrorMessage(error));
    });
  }, [wake, sleep, logId, date, energy, focus, mood, dayRating]);

  const matched = useMemo(() => (title.trim() ? matchGoalForTitle(title, goals) : null), [title, goals]);

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
    void addSessionToDb({
      log_id: logId,
      title: title.trim(),
      intentional,
      difficulty,
      start_time: startIso,
      end_time: endIso,
    })
      .then(async () => {
        setSessions(await fetchSessionsFromDb(logId));
        setTitle("");
      })
      .catch((error) => {
        toast.error(getErrorMessage(error));
      });
  };

  const remove = (id: string) => {
    void deleteSessionFromDb(id)
      .then(async () => {
        if (!logId) return;
        setSessions(await fetchSessionsFromDb(logId));
      })
      .catch((error) => {
        toast.error(getErrorMessage(error));
      });
  };

  const metrics = useMemo(
    () =>
      logId
        ? computeMetrics(
            {
              id: logId,
              date,
              wake_time: wake,
              sleep_time: sleep,
              energy_level: energy,
              focus_level: focus,
              mood,
              day_rating: dayRating,
              created_at: "",
            },
            sessions,
          )
        : null,
    [sessions, wake, sleep, energy, focus, mood, dayRating, logId, date],
  );

  const quickAdd = (quickTitle: string, minutes: number, quickIntentional = true, quickDifficulty: 1 | 2 | 3 | 4 | 5 = 3) => {
    if (!logId) return;
    const startIso = toIso(date, start);
    const endIso = toIso(date, addMinutesToTime(start, minutes));
    void addSessionToDb({
      log_id: logId,
      title: quickTitle,
      intentional: quickIntentional,
      difficulty: quickDifficulty,
      start_time: startIso,
      end_time: endIso,
    })
      .then(async () => {
        setSessions(await fetchSessionsFromDb(logId));
      })
      .catch((error) => {
        toast.error(getErrorMessage(error));
      });
  };

  const runAnalysis = () => {
    if (!logId || sessions.length === 0) return;

    if (existingAnalysis) {
      router.push("/app");
      return;
    }

    setSubmitting(true);

    const payload: AnalyzeDayPayload = {
      sessions,
      goals,
      dailyLog: {
        wake_time: wake,
        sleep_time: sleep,
        energy_level: energy,
        focus_level: focus,
        mood,
        day_rating: dayRating,
      },
    };

    void fetch("/api/analyze-day", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
      .then(async (response) => {
        const body = (await response.json()) as AnalyzeDayResult | { error?: string };
        if (!response.ok || !("summary" in body)) {
          throw new Error("error" in body && body.error ? body.error : "Unable to analyze the day.");
        }

        const saved = await saveDailyAnalysisToDb({
          log_id: logId,
          total_productive_minutes: metrics?.productive ?? 0,
          total_distraction_minutes: metrics?.distraction ?? 0,
          total_neutral_minutes: metrics?.neutral ?? 0,
          untracked_minutes: metrics?.untracked ?? 0,
          goal_contribution_score: metrics?.goalScore ?? 0,
          efficiency_score: metrics?.efficiencyScore ?? 0,
          goal_breakdown: metrics?.goalBreakdown ?? [],
          summary: body.summary,
          core_problem: body.core_problem,
          key_action: body.key_action,
          positives: body.positives,
          problems: body.problems,
          suggestions: body.suggestions,
          pattern_detected: body.pattern_detected,
          contribution_levels: body.contribution_levels,
        });

        setExistingAnalysis(saved);
        toast.success("Today’s analysis is ready.");
        router.push("/app");
      })
      .catch((error) => {
        toast.error(getErrorMessage(error));
      })
      .finally(() => {
        setSubmitting(false);
      });
  };

  return (
    <>
      <div className="px-4 md:px-8 py-6 md:py-10 max-w-5xl mx-auto space-y-6">
        {loadError && (
          <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-foreground">
            {loadError}
          </div>
        )}

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

        <div className="rounded-2xl border border-border bg-card p-5 md:p-6 space-y-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-base font-medium">Daily check-in</h2>
              <p className="text-xs text-muted-foreground">Capture how today actually felt before you analyze it.</p>
            </div>
            <div className="text-xs text-muted-foreground">Prefilled from today</div>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <LevelGroup label="Energy" value={energy} onChange={setEnergy} />
            <LevelGroup label="Focus" value={focus} onChange={setFocus} />
            <MoodGroup value={mood} onChange={setMood} />
            <RatingGroup value={dayRating} onChange={setDayRating} />
          </div>
        </div>

        {/* Add session */}
        <div className="rounded-2xl border border-border bg-card p-5 md:p-6">
          <div className="flex items-center gap-2 mb-4">
            <Plus className="h-4 w-4 text-primary" />
            <h2 className="font-display text-base font-medium">Add session</h2>
          </div>

          <div className="flex flex-wrap gap-2 mb-4">
            {[
              { label: "Focus block", title: "Deep work", minutes: 90 },
              { label: "Workout", title: "Workout", minutes: 45 },
              { label: "Recovery", title: "Break", minutes: 20, intentional: false as const },
              { label: "Study", title: "Study", minutes: 60 },
            ].map((quick) => (
              <button
                key={quick.label}
                type="button"
                onClick={() => quickAdd(quick.title, quick.minutes, quick.intentional ?? true)}
                className="rounded-full border border-border bg-background px-3 py-1.5 text-xs text-foreground hover:border-primary/40 hover:text-primary transition-colors"
              >
                {quick.label}
              </button>
            ))}
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
            <div className="md:col-span-2 space-y-2">
              <Label className="text-xs">Intentional</Label>
              <div className="flex h-10 items-center rounded-md border border-border bg-background px-3">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={intentional} onChange={(e) => setIntentional(e.target.checked)} />
                  Deliberate session
                </label>
              </div>
            </div>
            <div className="md:col-span-2 space-y-2">
              <Label className="text-xs">Difficulty</Label>
              <Input type="number" min={1} max={5} value={difficulty} onChange={(e) => setDifficulty(Number(e.target.value) as 1 | 2 | 3 | 4 | 5)} className="bg-background border-border h-10" />
            </div>
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
                const goal = matchGoalForTitle(s.title, goals);
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
          {submitting ? "Generating today’s analysis..." : existingAnalysis ? "Open dashboard" : "Generate today’s analysis"}
        </Button>
      </div>
    </>
  );
};

const LevelGroup = ({
  label,
  value,
  onChange,
}: {
  label: string;
  value: 1 | 2 | 3 | 4 | 5;
  onChange: (value: 1 | 2 | 3 | 4 | 5) => void;
}) => (
  <div className="space-y-2">
    <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
    <div className="grid grid-cols-5 gap-1.5">
      {[1, 2, 3, 4, 5].map((level) => (
        <button
          key={level}
          type="button"
          onClick={() => onChange(level as 1 | 2 | 3 | 4 | 5)}
          className={cn(
            "h-10 rounded-lg border text-sm transition-colors",
            value === level ? "border-primary bg-primary/10 text-primary" : "border-border bg-background text-muted-foreground",
          )}
        >
          {level}
        </button>
      ))}
    </div>
  </div>
);

const MoodGroup = ({
  value,
  onChange,
}: {
  value: "low" | "neutral" | "good";
  onChange: (value: "low" | "neutral" | "good") => void;
}) => (
  <div className="space-y-2">
    <div className="text-xs uppercase tracking-wider text-muted-foreground">Mood</div>
    <div className="grid grid-cols-3 gap-1.5">
      {[
        ["low", "Low"],
        ["neutral", "Neutral"],
        ["good", "Good"],
      ].map(([moodValue, label]) => (
        <button
          key={moodValue}
          type="button"
          onClick={() => onChange(moodValue as "low" | "neutral" | "good")}
          className={cn(
            "h-10 rounded-lg border text-sm transition-colors",
            value === moodValue ? "border-primary bg-primary/10 text-primary" : "border-border bg-background text-muted-foreground",
          )}
        >
          {label}
        </button>
      ))}
    </div>
  </div>
);

const RatingGroup = ({
  value,
  onChange,
}: {
  value: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;
  onChange: (value: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10) => void;
}) => (
  <div className="space-y-2">
    <div className="text-xs uppercase tracking-wider text-muted-foreground">Day rating</div>
    <div className="grid grid-cols-5 gap-1.5">
      {[1, 3, 5, 7, 10].map((rating) => (
        <button
          key={rating}
          type="button"
          onClick={() => onChange(rating as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10)}
          className={cn(
            "h-10 rounded-lg border text-sm transition-colors",
            value === rating ? "border-primary bg-primary/10 text-primary" : "border-border bg-background text-muted-foreground",
          )}
        >
          {rating}
        </button>
      ))}
    </div>
  </div>
);

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

