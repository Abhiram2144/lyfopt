"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Sparkles, Brain, AlertTriangle, CheckCircle2, ThumbsUp, ArrowLeft, Target, Zap } from "lucide-react";
import { loadProfileFromDatabase, baselineLabel, failureLabel, type OnboardingProfile } from "@/lib/onboarding";
import { getErrorMessage } from "@/lib/error";
import { fetchDailyLogsFromDb, fetchGoalsFromDb, fetchSessionsFromDb, type DailyLog, type Goal } from "@/lib/sessions";
import { useAuth } from "@/components/site/AuthProvider";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { AnalyzeDayPayload, AnalyzeDayResult, AnalyzeDayMeta } from "@/lib/ai";

interface AnalyzeDayApiResponse extends AnalyzeDayResult {
  _meta?: AnalyzeDayMeta;
  _debug?: {
    payload?: AnalyzeDayPayload;
  };
  error?: string;
}

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] as const },
};

const toneMap = {
  strict: "strict",
  balanced: "balanced",
  supportive: "motivational",
} as const;

const buildProfileForAnalysis = (profile: OnboardingProfile | null): AnalyzeDayPayload["userProfile"] | undefined => {
  if (!profile) return undefined;
  const strengths = [] as string[];
  if (profile.baseline_type) {
    strengths.push(baselineLabel[profile.baseline_type]);
    strengths.push(
      profile.baseline_type === "disciplined_optimize"
        ? "already values structure"
        : profile.baseline_type === "capable_inconsistent"
          ? "has real capacity when focused"
          : profile.baseline_type === "all_over_the_place"
            ? "can benefit strongly from better boundaries"
            : "can scale once the right rhythm is set",
    );
  }

  return {
    tone: profile.feedback_style ? toneMap[profile.feedback_style] : "balanced",
    weaknesses: profile.failure_patterns.map((pattern) => failureLabel[pattern]),
    strengths,
  };
};

const AnalysisResult = () => {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [report, setReport] = useState<AnalyzeDayResult | null>(null);
  const [reportMeta, setReportMeta] = useState<AnalyzeDayMeta | null>(null);
  const [requestPayload, setRequestPayload] = useState<AnalyzeDayPayload | null>(null);
  const [responsePayload, setResponsePayload] = useState<AnalyzeDayApiResponse | null>(null);
  const [log, setLog] = useState<DailyLog | null>(null);
  const [profile, setProfile] = useState<OnboardingProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [debugEnabled, setDebugEnabled] = useState(false);
  const [debugOpen, setDebugOpen] = useState(true);

  useEffect(() => {
    let active = true;

    const load = async () => {
      if (loading || !user) return;

      setIsLoading(true);
      setLoadError(null);
      const urlDebug = new URLSearchParams(window.location.search).get("debugAi") === "1";
      setDebugEnabled(urlDebug);

      try {
        const [logs, sessions, goals, savedProfile] = await Promise.all([
          fetchDailyLogsFromDb(),
          fetchSessionsFromDb(),
          fetchGoalsFromDb(),
          loadProfileFromDatabase(user.id),
        ]);

        const logId = sessionStorage.getItem("lyfopt:analyze:logId");
        const selectedLog = logId ? logs.find((entry) => entry.id === logId) : logs[logs.length - 1] ?? null;

        if (!selectedLog) {
          router.replace("/app/log");
          return;
        }

        const selectedSessions = sessions.filter((session) => session.log_id === selectedLog.id);
        const payload: AnalyzeDayPayload = {
          sessions: selectedSessions,
          goals,
          dailyLog: {
            wake_time: selectedLog.wake_time,
            sleep_time: selectedLog.sleep_time,
            energy_level: selectedLog.energy_level,
            focus_level: selectedLog.focus_level,
            mood: selectedLog.mood,
            day_rating: selectedLog.day_rating,
          },
          userProfile: buildProfileForAnalysis(savedProfile),
        };

        setRequestPayload(payload);

        const response = await fetch(`/api/analyze-day${urlDebug ? "?debug=1" : ""}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const body = (await response.json()) as AnalyzeDayApiResponse;
        setResponsePayload(body);
        if (!response.ok) {
          throw new Error(body.error ?? "Unable to analyze the day.");
        }

        if (!active) return;
        setLog(selectedLog);
        setProfile(savedProfile);
        setReportMeta(body._meta ?? null);
        setReport(body);
      } catch (error) {
        if (!active) return;
        setLoadError(getErrorMessage(error));
      } finally {
        if (active) setIsLoading(false);
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, [loading, router, user]);

  return (
    <>
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
          {isLoading && !report && (
            <motion.div
              key="loading"
              {...fadeUp}
              className="rounded-2xl border border-border bg-card p-12 flex flex-col items-center gap-6"
            >
              <div className="relative">
                <div className="absolute inset-0 rounded-full bg-primary/30 blur-2xl animate-pulse-glow" />
                <div className="relative grid h-16 w-16 place-items-center rounded-full bg-primary/10 border border-primary/40">
                  <Brain className="h-7 w-7 text-primary" />
                </div>
              </div>
              <div className="text-center space-y-2">
                <div className="text-sm font-medium">Analyzing your day…</div>
                <div className="text-xs text-muted-foreground">Gemini is reading your log, sessions, goals, and context.</div>
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

          {report && log && (
            <motion.div key="report" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="grid grid-cols-3 gap-3"
              >
                <ScorePill icon={Zap} label="Source" value={reportMeta?.source === "gemini" ? "Gemini" : "Fallback"} />
                <ScorePill icon={Target} label="Log date" value={log.date} />
                <ScorePill icon={AlertTriangle} label="Mood" value={log.mood} dim />
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

              <Block delay={0.5} icon={<ThumbsUp className="h-4 w-4 text-primary" />} title="Pattern detected">
                <p className="text-sm text-foreground/90 leading-relaxed">{report.pattern_detected}</p>
              </Block>

              <List
                title="Positives"
                icon={<ThumbsUp className="h-4 w-4 text-primary" />}
                items={report.positives}
                bulletClass="text-primary"
                startDelay={0.55}
              />
              <List
                title="Problems"
                icon={<AlertTriangle className="h-4 w-4 text-destructive" />}
                items={report.problems}
                bulletClass="text-destructive"
                startDelay={0.55 + report.positives.length * 0.18}
              />
              <List
                title="Suggestions"
                icon={<CheckCircle2 className="h-4 w-4 text-primary" />}
                items={report.suggestions}
                bulletClass="text-primary"
                startDelay={0.55 + (report.problems.length + report.positives.length) * 0.18}
              />

              <div className="flex flex-wrap gap-3 pt-2">
                <Button asChild variant="hero">
                  <Link href="/app">Back to dashboard</Link>
                </Button>
                <Button asChild variant="glow">
                  <Link href="/app/log">Log another</Link>
                </Button>
              </div>

              {debugEnabled && (
                <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="text-xs uppercase tracking-wider text-muted-foreground">AI Debug</div>
                    <Button type="button" variant="ghost" size="sm" onClick={() => setDebugOpen((value) => !value)}>
                      {debugOpen ? "Hide" : "Show"}
                    </Button>
                  </div>
                  {debugOpen && (
                    <>
                      <div className="text-xs text-muted-foreground">
                        Source: <span className="text-foreground">{reportMeta?.source ?? "unknown"}</span>
                      </div>
                      <details>
                        <summary className="cursor-pointer text-sm text-foreground">Request payload sent to API</summary>
                        <pre className="mt-2 max-h-60 overflow-auto rounded bg-background p-3 text-xs">{JSON.stringify(requestPayload, null, 2)}</pre>
                      </details>
                      <details>
                        <summary className="cursor-pointer text-sm text-foreground">Raw API response</summary>
                        <pre className="mt-2 max-h-60 overflow-auto rounded bg-background p-3 text-xs">{JSON.stringify(responsePayload, null, 2)}</pre>
                      </details>
                    </>
                  )}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
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
    <div className={cn("mt-2 font-display text-xl font-semibold", dim ? "text-destructive" : "text-primary")}>{value}</div>
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
        {items.map((item, index) => (
          <motion.li
            key={index}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: startDelay + index * 0.18, duration: 0.35 }}
            className="flex items-start gap-2.5 rounded-xl border border-border bg-card px-4 py-3 text-sm"
          >
            <span className={cn("mt-0.5 text-base leading-none", bulletClass)}>•</span>
            <span className="text-foreground/90 leading-relaxed">{item}</span>
          </motion.li>
        ))}
      </ul>
    </motion.div>
  );
};

export default AnalysisResult;
