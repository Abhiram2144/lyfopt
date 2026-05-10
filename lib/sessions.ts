import { supabase } from "@/lib/supabase";

// Session-based time logging model.
// Mirrors the schema: daily_logs, activity_sessions, goals, monthly_reviews, user_preferences.

export type SessionCategory = "productive" | "neutral" | "distraction";
export type MoodLevel = "low" | "neutral" | "good";
export type GoalPriority = "low" | "medium" | "high";
export type GoalTimeHorizon = "daily" | "weekly" | "long-term";

export interface ActivitySession {
  id: string;
  log_id: string;
  title: string;
  category: SessionCategory;
  intentional: boolean;
  difficulty: 1 | 2 | 3 | 4 | 5;
  start_time: string; // ISO
  end_time: string;   // ISO
  duration_minutes: number;
  created_at: string;
}

export interface DailyLog {
  id: string;
  date: string;        // YYYY-MM-DD
  wake_time: string;   // HH:MM
  sleep_time: string;  // HH:MM (next day)
  energy_level: 1 | 2 | 3 | 4 | 5;
  focus_level: 1 | 2 | 3 | 4 | 5;
  mood: MoodLevel;
  day_rating: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;
  created_at: string;
}

export interface Goal {
  id: string;
  title: string;
  type: "short_term" | "long_term";
  category: string; // e.g. football, study, health
  priority: GoalPriority;
  time_horizon: GoalTimeHorizon;
  identity_tag: string;
  is_active: boolean;
  created_at: string;
  keywords: string[]; // inline goal_activity_map
  // New fields: open_ended vs measurable
  open_ended?: boolean;
  target_value?: number | null;
  target_unit?: string | null;
}

export interface DailyAnalysis {
  id: string;
  log_id: string;
  total_productive_minutes: number;
  total_distraction_minutes: number;
  total_neutral_minutes: number;
  untracked_minutes: number;
  goal_contribution_score: number; // 0-100
  efficiency_score: number;        // 0-100
  goal_breakdown: { goal_id: string; title: string; minutes: number }[];
  summary: string;
  core_problem: string;
  key_action: string;
  positives?: string[];
  problems?: string[];
  suggestions?: string[];
  pattern_detected?: string;
  contribution_levels?: string[];
  created_at: string;
}

export interface DayEntry {
  date: string;
  sleep: number;
  focus: number;
  distraction: number;
  energy: number;
  score: number;
  summary: string;
}

const KEYS = {
  logs: "lyfopt:logs",
  sessions: "lyfopt:sessions",
  goals: "lyfopt:goals",
  prefs: "lyfopt:prefs",
  monthly: "lyfopt:monthly",
  analysis: "lyfopt:analysis",
};

const DAILY_ANALYSIS_CACHE_PREFIX = "lyfopt:analysis-cache:";

const uid = () =>
  globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;

const read = <T,>(k: string, fb: T): T => {
  try {
    const raw = localStorage.getItem(k);
    return raw ? (JSON.parse(raw) as T) : fb;
  } catch {
    return fb;
  }
};
const write = (k: string, v: unknown) => localStorage.setItem(k, JSON.stringify(v));

// ---------- Logs ----------
export const getLogs = () => read<DailyLog[]>(KEYS.logs, []);
export const getLogByDate = (date: string) => getLogs().find((l) => l.date === date);
export const upsertLog = (log: Omit<DailyLog, "id" | "created_at"> & { id?: string }): DailyLog => {
  const logs = getLogs();
  const existing = logs.find((l) => l.date === log.date);
  if (existing) {
    const merged = { ...existing, ...log, id: existing.id };
    write(KEYS.logs, logs.map((l) => (l.id === existing.id ? merged : l)));
    return merged;
  }
  const created: DailyLog = {
    id: log.id ?? uid(),
    date: log.date,
    wake_time: log.wake_time,
    sleep_time: log.sleep_time,
    energy_level: log.energy_level,
    focus_level: log.focus_level,
    mood: log.mood,
    day_rating: log.day_rating,
    created_at: new Date().toISOString(),
  };
  write(KEYS.logs, [...logs, created]);
  return created;
};

// ---------- Sessions ----------
export const getSessions = () => read<ActivitySession[]>(KEYS.sessions, []);
export const getSessionsForLog = (log_id: string) =>
  getSessions()
    .filter((s) => s.log_id === log_id)
    .sort((a, b) => a.start_time.localeCompare(b.start_time));

export const addSession = (
  s: Omit<ActivitySession, "id" | "created_at" | "duration_minutes" | "category" | "intentional" | "difficulty"> & {
    category?: SessionCategory;
    intentional?: boolean;
    difficulty?: 1 | 2 | 3 | 4 | 5;
  },
): ActivitySession => {
  const normalized = normalizeSessionRange(s.start_time, s.end_time);

  // Simple heuristic to avoid asking users for a 'type':
  // - If title matches a goal -> productive
  // - If title contains social/gaming keywords -> distraction
  // - Otherwise neutral
  const t = s.title.toLowerCase();
  const social = ["instagram", "tiktok", "twitter", "x", "youtube", "reddit", "facebook", "snap", "snapchat", "discord", "game", "gaming", "fortnite", "xbox", "playstation"];
  let category: SessionCategory = s.category ?? "neutral";
  if (!s.category) {
    if (matchGoalForTitle(s.title)) category = "productive";
    else if (social.some((k) => t.includes(k))) category = "distraction";
    else category = "neutral";
  }

  const created: ActivitySession = {
    ...s,
    id: uid(),
    category,
    intentional: s.intentional ?? true,
    difficulty: s.difficulty ?? 3,
    start_time: normalized.startIso,
    end_time: normalized.endIso,
    duration_minutes: normalized.duration,
    created_at: new Date().toISOString(),
  };
  write(KEYS.sessions, [...getSessions(), created]);
  return created;
};

export const deleteSession = (id: string) => {
  write(KEYS.sessions, getSessions().filter((s) => s.id !== id));
};

// ---------- Goals ----------
const seedGoals = (): Goal[] => [
  {
    id: uid(),
    title: "Get better at football",
    type: "long_term",
    category: "football",
    priority: "high",
    time_horizon: "long-term",
    identity_tag: "athlete",
    is_active: true,
    created_at: new Date().toISOString(),
    keywords: ["football", "soccer", "training"],
  },
  {
    id: uid(),
    title: "Study consistently",
    type: "long_term",
    category: "study",
    priority: "high",
    time_horizon: "weekly",
    identity_tag: "learner",
    is_active: true,
    created_at: new Date().toISOString(),
    keywords: ["library", "study", "reading", "course"],
  },
];

export const getGoals = (): Goal[] => {
  const existing = read<Goal[] | null>(KEYS.goals, null);
  if (existing && existing.length) return existing;
  const seeded = seedGoals();
  write(KEYS.goals, seeded);
  return seeded;
};

export const saveGoals = (goals: Goal[]) => write(KEYS.goals, goals);

export const addGoal = (g: Omit<Goal, "id" | "created_at" | "is_active"> & { is_active?: boolean }): Goal => {
  const created: Goal = {
    ...g,
    id: uid(),
    is_active: g.is_active ?? true,
    priority: g.priority ?? "medium",
    time_horizon: g.time_horizon ?? "weekly",
    identity_tag: g.identity_tag ?? "",
    created_at: new Date().toISOString(),
  };
  saveGoals([...getGoals(), created]);
  return created;
};

// ---------- Preferences ----------
export interface UserPreferences {
  gaming_is_distraction?: boolean;
}

export const getUserPreferences = (): UserPreferences => read<UserPreferences>(KEYS.prefs, {});
export const saveUserPreferences = (p: UserPreferences) => write(KEYS.prefs, p);

// ---------- Monthly reviews ----------
export interface MonthlyReview {
  id: string;
  month_start: string; // YYYY-MM-01
  answers: Record<string, string>;
  created_at: string;
}

export const getMonthlyReviews = (): MonthlyReview[] => read<MonthlyReview[]>(KEYS.monthly, []);
export const addMonthlyReview = (r: Omit<MonthlyReview, "id" | "created_at">): MonthlyReview => {
  const created: MonthlyReview = { ...r, id: uid(), created_at: new Date().toISOString() };
  write(KEYS.monthly, [...getMonthlyReviews(), created]);
  return created;
};

export const deleteGoal = (id: string) => saveGoals(getGoals().filter((g) => g.id !== id));

// ---------- Daily analysis ----------
export const getDailyAnalyses = () => read<DailyAnalysis[]>(KEYS.analysis, []);

export const getDailyAnalysisForLog = (logId: string) => getDailyAnalyses().find((analysis) => analysis.log_id === logId) ?? null;

export const saveDailyAnalysis = (
  analysis: Omit<DailyAnalysis, "id" | "created_at"> & { id?: string; created_at?: string },
): DailyAnalysis => {
  const analyses = getDailyAnalyses();
  const existing = analyses.find((entry) => entry.log_id === analysis.log_id);
  const nextAnalysis: DailyAnalysis = {
    ...analysis,
    id: existing?.id ?? analysis.id ?? uid(),
    created_at: existing?.created_at ?? analysis.created_at ?? new Date().toISOString(),
  };

  if (existing) {
    write(
      KEYS.analysis,
      analyses.map((entry) => (entry.log_id === analysis.log_id ? nextAnalysis : entry)),
    );
    return nextAnalysis;
  }

  write(KEYS.analysis, [...analyses, nextAnalysis]);
  return nextAnalysis;
};

const getDailyAnalysisCacheKey = (logId: string) => `${DAILY_ANALYSIS_CACHE_PREFIX}${logId}`;

export const getCachedDailyAnalysis = (logId: string): DailyAnalysis | null => {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(getDailyAnalysisCacheKey(logId));
    return raw ? (JSON.parse(raw) as DailyAnalysis) : null;
  } catch {
    return null;
  }
};

export const cacheDailyAnalysis = (analysis: DailyAnalysis) => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(getDailyAnalysisCacheKey(analysis.log_id), JSON.stringify(analysis));
  } catch {
    // Ignore cache write failures.
  }
};

// ---------- Matching ----------
export const matchGoalForTitle = (title: string, goals = getGoals()): Goal | null => {
  const t = title.toLowerCase();
  for (const g of goals) {
    if (!g.is_active) continue;
    if (g.keywords.some((k) => t.includes(k.toLowerCase()))) return g;
    if (t.includes(g.category.toLowerCase())) return g;
  }
  return null;
};

// ---------- Analysis computation ----------
export interface ComputedMetrics {
  productive: number;
  distraction: number;
  neutral: number;
  untracked: number;
  awakeMinutes: number;
  goalScore: number;
  efficiencyScore: number;
  goalBreakdown: { goal_id: string; title: string; minutes: number }[];
  topActivity: { title: string; minutes: number } | null;
}

export const computeMetrics = (
  log: DailyLog,
  sessions: ActivitySession[],
  goals = getGoals(),
): ComputedMetrics => {
  const productive = sessions.filter((s) => s.category === "productive").reduce((a, s) => a + s.duration_minutes, 0);
  const distraction = sessions.filter((s) => s.category === "distraction").reduce((a, s) => a + s.duration_minutes, 0);
  const neutral = sessions.filter((s) => s.category === "neutral").reduce((a, s) => a + s.duration_minutes, 0);

  // awake window = wake_time -> sleep_time (sleep_time may be next day)
  const [wh, wm] = log.wake_time.split(":").map(Number);
  const [sh, sm] = log.sleep_time.split(":").map(Number);
  let awake = sh * 60 + sm - (wh * 60 + wm);
  if (awake <= 0) awake += 24 * 60;
  const tracked = productive + distraction + neutral;
  // Consider 2 hours for eating as non-wasted time
  const raw_untracked = Math.max(0, awake - tracked - 120);
  const untracked = Math.max(0, raw_untracked);

  // Goal contribution
  const goalMap = new Map<string, { title: string; minutes: number }>();
  for (const s of sessions) {
    const g = matchGoalForTitle(s.title, goals);
    if (g) {
      const cur = goalMap.get(g.id) ?? { title: g.title, minutes: 0 };
      cur.minutes += s.duration_minutes;
      goalMap.set(g.id, cur);
    }
  }
  const goalMinutes = [...goalMap.values()].reduce((a, v) => a + v.minutes, 0);
  const goalScore = awake > 0 ? Math.round((goalMinutes / awake) * 100) : 0;
  const efficiencyScore = awake > 0 ? Math.round((productive / awake) * 100) : 0;

  // Top activity
  const titleMap = new Map<string, number>();
  for (const s of sessions) titleMap.set(s.title, (titleMap.get(s.title) ?? 0) + s.duration_minutes);
  const top = [...titleMap.entries()].sort((a, b) => b[1] - a[1])[0];

  return {
    productive,
    distraction,
    neutral,
    untracked,
    awakeMinutes: awake,
    goalScore,
    efficiencyScore,
    goalBreakdown: [...goalMap.entries()].map(([goal_id, v]) => ({ goal_id, ...v })),
    topActivity: top ? { title: top[0], minutes: top[1] } : null,
  };
};

// ---------- Streaks ----------
export const computeStreaks = (logs: DailyLog[]) => {
  const dates = new Set(logs.map((l) => l.date));
  const sorted = logs.map((l) => l.date).sort();
  let best = 0;
  let current = 0;
  let lastDate: string | null = null;

  for (const d of sorted) {
    if (!lastDate) {
      current = 1;
    } else {
      const prev: Date = new Date(lastDate);
      prev.setDate(prev.getDate() + 1);
      const expected: string = prev.toISOString().slice(0, 10);
      if (d === expected) current += 1;
      else current = 1;
    }
    best = Math.max(best, current);
    lastDate = d;
  }

  // current streak up to today
  let currentUpToToday = 0;
  const today = new Date();
  const cursor = new Date(today);
  while (true) {
    const key = cursor.toISOString().slice(0, 10);
    if (dates.has(key)) {
      currentUpToToday += 1;
      cursor.setDate(cursor.getDate() - 1);
    } else break;
  }

  return { current: currentUpToToday, best };
};

export const fmtMins = (m: number) => {
  const h = Math.floor(m / 60);
  const r = m % 60;
  if (h && r) return `${h}h ${r}m`;
  if (h) return `${h}h`;
  return `${r}m`;
};

// ---------- Today helper ----------
export const todayDate = () => new Date().toISOString().slice(0, 10);

const getAuthedProfileId = async () => {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  if (!data.user) throw new Error("No authenticated user found.");
  return data.user.id;
};

const toIsoDate = (value: string) => new Date(value).toISOString();

const normalizeSessionRange = (startValue: string, endValue: string) => {
  const start = new Date(startValue).getTime();
  let end = new Date(endValue).getTime();

  if (Number.isNaN(start) || Number.isNaN(end)) {
    return {
      startIso: toIsoDate(startValue),
      endIso: toIsoDate(endValue),
      duration: 0,
    };
  }

  // If end is not after start, treat it as an overnight session.
  if (end <= start) {
    end += 24 * 60 * 60 * 1000;
  }

  return {
    startIso: new Date(start).toISOString(),
    endIso: new Date(end).toISOString(),
    duration: Math.max(0, Math.round((end - start) / 60000)),
  };
};

// ---------- Supabase-backed CRUD ----------
export const fetchDailyLogsFromDb = async (): Promise<DailyLog[]> => {
  const profileId = await getAuthedProfileId();
  const { data, error } = await supabase
    .from("daily_logs")
    .select("id, date, wake_time, sleep_time, energy_level, focus_level, mood, day_rating, created_at, updated_at")
    .eq("profile_id", profileId)
    .order("date", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id,
    date: row.date,
    wake_time: row.wake_time ?? "07:30",
    sleep_time: row.sleep_time ?? "23:30",
    energy_level: row.energy_level ?? 3,
    focus_level: row.focus_level ?? 3,
    mood: (row.mood as MoodLevel | null) ?? "neutral",
    day_rating: row.day_rating ?? 5,
    created_at: row.created_at,
  }));
};

export const fetchDailyLogByDateFromDb = async (date: string): Promise<DailyLog | null> => {
  const profileId = await getAuthedProfileId();
  const { data, error } = await supabase
    .from("daily_logs")
    .select("id, date, wake_time, sleep_time, energy_level, focus_level, mood, day_rating, created_at, updated_at")
    .eq("profile_id", profileId)
    .eq("date", date)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    id: data.id,
    date: data.date,
    wake_time: data.wake_time ?? "07:30",
    sleep_time: data.sleep_time ?? "23:30",
    energy_level: data.energy_level ?? 3,
    focus_level: data.focus_level ?? 3,
    mood: (data.mood as MoodLevel | null) ?? "neutral",
    day_rating: data.day_rating ?? 5,
    created_at: data.created_at,
  };
};

export const upsertDailyLogToDb = async (log: Omit<DailyLog, "id" | "created_at"> & { id?: string }): Promise<DailyLog> => {
  const profileId = await getAuthedProfileId();
  const payload = {
    profile_id: profileId,
    date: log.date,
    wake_time: log.wake_time,
    sleep_time: log.sleep_time,
    energy_level: log.energy_level,
    focus_level: log.focus_level,
    mood: log.mood,
    day_rating: log.day_rating,
  };
  const { data, error } = await supabase
    .from("daily_logs")
    .upsert(payload, { onConflict: "profile_id,date" })
    .select("id, date, wake_time, sleep_time, energy_level, focus_level, mood, day_rating, created_at")
    .single();
  if (error) throw error;
  return {
    id: data.id,
    date: data.date,
    wake_time: data.wake_time ?? "07:30",
    sleep_time: data.sleep_time ?? "23:30",
    energy_level: data.energy_level ?? 3,
    focus_level: data.focus_level ?? 3,
    mood: (data.mood as MoodLevel | null) ?? "neutral",
    day_rating: data.day_rating ?? 5,
    created_at: data.created_at,
  };
};

export const fetchSessionsFromDb = async (logId?: string): Promise<ActivitySession[]> => {
  const profileId = await getAuthedProfileId();
  let query = supabase
    .from("activity_sessions")
    .select("id, profile_id, log_id, title, start_time, end_time, duration_minutes, category, intentional, difficulty, created_at")
    .eq("profile_id", profileId)
    .order("start_time", { ascending: true });
  if (logId) query = query.eq("log_id", logId);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map((row) => {
    const normalized = normalizeSessionRange(row.start_time, row.end_time);
    return {
      id: row.id,
      log_id: row.log_id,
      title: row.title,
      category: row.category as SessionCategory,
      intentional: row.intentional ?? true,
      difficulty: row.difficulty ?? 3,
      start_time: row.start_time,
      end_time: row.end_time,
      duration_minutes: row.duration_minutes && row.duration_minutes > 0 ? row.duration_minutes : normalized.duration,
      created_at: row.created_at,
    };
  });
};

export const addSessionToDb = async (
  s: Omit<ActivitySession, "id" | "created_at" | "duration_minutes" | "category" | "intentional" | "difficulty"> & {
    category?: SessionCategory;
    intentional?: boolean;
    difficulty?: 1 | 2 | 3 | 4 | 5;
  },
): Promise<ActivitySession> => {
  const profileId = await getAuthedProfileId();
  const normalized = normalizeSessionRange(s.start_time, s.end_time);

  const t = s.title.toLowerCase();
  const social = ["instagram", "tiktok", "twitter", "x", "youtube", "reddit", "facebook", "snap", "snapchat", "discord", "game", "gaming", "fortnite", "xbox", "playstation"];
  let category: SessionCategory = s.category ?? "neutral";
  if (!s.category) {
    if (matchGoalForTitle(s.title)) category = "productive";
    else if (social.some((k) => t.includes(k))) category = "distraction";
    else category = "neutral";
  }

  const payload = {
    profile_id: profileId,
    log_id: s.log_id,
    title: s.title,
    category,
    intentional: s.intentional ?? true,
    difficulty: s.difficulty ?? 3,
    start_time: normalized.startIso,
    end_time: normalized.endIso,
    duration_minutes: normalized.duration,
  };

  const { data, error } = await supabase
    .from("activity_sessions")
    .insert(payload)
    .select("id, profile_id, log_id, title, start_time, end_time, duration_minutes, category, intentional, difficulty, created_at")
    .single();
  if (error) throw error;
  return {
    id: data.id,
    log_id: data.log_id,
    title: data.title,
    category: data.category as SessionCategory,
    intentional: data.intentional ?? true,
    difficulty: data.difficulty ?? 3,
    start_time: data.start_time,
    end_time: data.end_time,
    duration_minutes: data.duration_minutes,
    created_at: data.created_at,
  };
};

export const deleteSessionFromDb = async (id: string) => {
  const profileId = await getAuthedProfileId();
  const { error } = await supabase.from("activity_sessions").delete().eq("id", id).eq("profile_id", profileId);
  if (error) throw error;
};

export const fetchGoalsFromDb = async (): Promise<Goal[]> => {
  const profileId = await getAuthedProfileId();
  const { data, error } = await supabase
    .from("goals")
    .select("id, profile_id, title, type, category, priority, time_horizon, identity_tag, open_ended, target_value, target_unit, is_active, keywords, created_at")
    .eq("profile_id", profileId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id,
    title: row.title,
    type: row.type as Goal["type"],
    category: row.category ?? "",
    priority: (row.priority as GoalPriority | null) ?? "medium",
    time_horizon: (row.time_horizon as GoalTimeHorizon | null) ?? "weekly",
    identity_tag: row.identity_tag ?? "",
    is_active: row.is_active,
    created_at: row.created_at,
    keywords: row.keywords ?? [],
    open_ended: row.open_ended ?? true,
    target_value: row.target_value ?? null,
    target_unit: row.target_unit ?? null,
  }));
};

export const addGoalToDb = async (g: Omit<Goal, "id" | "created_at" | "is_active"> & { is_active?: boolean }): Promise<Goal> => {
  const profileId = await getAuthedProfileId();
  const payload = {
    profile_id: profileId,
    title: g.title,
    type: g.type,
    category: g.category,
    priority: g.priority ?? "medium",
    time_horizon: g.time_horizon ?? "weekly",
    identity_tag: g.identity_tag ?? "",
    open_ended: g.open_ended ?? true,
    target_value: g.target_value ?? null,
    target_unit: g.target_unit ?? null,
    is_active: g.is_active ?? true,
    keywords: g.keywords ?? [],
  };
  const { data, error } = await supabase
    .from("goals")
    .insert(payload)
    .select("id, profile_id, title, type, category, priority, time_horizon, identity_tag, open_ended, target_value, target_unit, is_active, keywords, created_at")
    .single();
  if (error) throw error;
  return {
    id: data.id,
    title: data.title,
    type: data.type as Goal["type"],
    category: data.category ?? "",
    priority: (data.priority as GoalPriority | null) ?? "medium",
    time_horizon: (data.time_horizon as GoalTimeHorizon | null) ?? "weekly",
    identity_tag: data.identity_tag ?? "",
    is_active: data.is_active,
    created_at: data.created_at,
    keywords: data.keywords ?? [],
    open_ended: data.open_ended ?? true,
    target_value: data.target_value ?? null,
    target_unit: data.target_unit ?? null,
  };
};

export const deleteGoalFromDb = async (id: string) => {
  const profileId = await getAuthedProfileId();
  const { error } = await supabase.from("goals").delete().eq("id", id).eq("profile_id", profileId);
  if (error) throw error;
};

export const fetchDailyAnalysisForLogFromDb = async (logId: string): Promise<DailyAnalysis | null> => {
  const cached = getCachedDailyAnalysis(logId);
  if (cached) return cached;

  const fallback = getDailyAnalysisForLog(logId);
  if (fallback) {
    cacheDailyAnalysis(fallback);
    return fallback;
  }

  try {
    const profileId = await getAuthedProfileId();
    const { data, error } = await supabase
      .from("daily_analyses")
      .select(
        "id, log_id, total_productive_minutes, total_distraction_minutes, total_neutral_minutes, untracked_minutes, goal_contribution_score, efficiency_score, goal_breakdown, summary, core_problem, key_action, positives, problems, suggestions, pattern_detected, contribution_levels, created_at",
      )
      .eq("profile_id", profileId)
      .eq("log_id", logId)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    const analysis: DailyAnalysis = {
      id: data.id,
      log_id: data.log_id,
      total_productive_minutes: data.total_productive_minutes ?? 0,
      total_distraction_minutes: data.total_distraction_minutes ?? 0,
      total_neutral_minutes: data.total_neutral_minutes ?? 0,
      untracked_minutes: data.untracked_minutes ?? 0,
      goal_contribution_score: data.goal_contribution_score ?? 0,
      efficiency_score: data.efficiency_score ?? 0,
      goal_breakdown: Array.isArray(data.goal_breakdown) ? (data.goal_breakdown as DailyAnalysis["goal_breakdown"]) : [],
      summary: data.summary ?? "",
      core_problem: data.core_problem ?? "",
      key_action: data.key_action ?? "",
      positives: Array.isArray(data.positives) ? (data.positives as string[]) : [],
      problems: Array.isArray(data.problems) ? (data.problems as string[]) : [],
      suggestions: Array.isArray(data.suggestions) ? (data.suggestions as string[]) : [],
      pattern_detected: data.pattern_detected ?? "",
      contribution_levels: Array.isArray(data.contribution_levels) ? (data.contribution_levels as string[]) : [],
      created_at: data.created_at,
    };

    cacheDailyAnalysis(analysis);
    saveDailyAnalysis(analysis);
    return analysis;
  } catch {
    return null;
  }
};

export const saveDailyAnalysisToDb = async (
  analysis: Omit<DailyAnalysis, "id" | "created_at"> & { id?: string; created_at?: string },
): Promise<DailyAnalysis> => {
  const localSaved = saveDailyAnalysis(analysis);
  cacheDailyAnalysis(localSaved);

  try {
    const profileId = await getAuthedProfileId();
    const payload = {
      profile_id: profileId,
      log_id: localSaved.log_id,
      total_productive_minutes: localSaved.total_productive_minutes,
      total_distraction_minutes: localSaved.total_distraction_minutes,
      total_neutral_minutes: localSaved.total_neutral_minutes,
      untracked_minutes: localSaved.untracked_minutes,
      goal_contribution_score: localSaved.goal_contribution_score,
      efficiency_score: localSaved.efficiency_score,
      goal_breakdown: localSaved.goal_breakdown,
      summary: localSaved.summary,
      core_problem: localSaved.core_problem,
      key_action: localSaved.key_action,
      positives: localSaved.positives ?? [],
      problems: localSaved.problems ?? [],
      suggestions: localSaved.suggestions ?? [],
      pattern_detected: localSaved.pattern_detected ?? "",
      contribution_levels: localSaved.contribution_levels ?? [],
    };

    const { data, error } = await supabase
      .from("daily_analyses")
      .upsert(payload, { onConflict: "profile_id,log_id" })
      .select(
        "id, log_id, total_productive_minutes, total_distraction_minutes, total_neutral_minutes, untracked_minutes, goal_contribution_score, efficiency_score, goal_breakdown, summary, core_problem, key_action, positives, problems, suggestions, pattern_detected, contribution_levels, created_at",
      )
      .single();

    if (error) throw error;

    const saved: DailyAnalysis = {
      id: data.id,
      log_id: data.log_id,
      total_productive_minutes: data.total_productive_minutes ?? 0,
      total_distraction_minutes: data.total_distraction_minutes ?? 0,
      total_neutral_minutes: data.total_neutral_minutes ?? 0,
      untracked_minutes: data.untracked_minutes ?? 0,
      goal_contribution_score: data.goal_contribution_score ?? 0,
      efficiency_score: data.efficiency_score ?? 0,
      goal_breakdown: Array.isArray(data.goal_breakdown) ? (data.goal_breakdown as DailyAnalysis["goal_breakdown"]) : [],
      summary: data.summary ?? "",
      core_problem: data.core_problem ?? "",
      key_action: data.key_action ?? "",
      positives: Array.isArray(data.positives) ? (data.positives as string[]) : [],
      problems: Array.isArray(data.problems) ? (data.problems as string[]) : [],
      suggestions: Array.isArray(data.suggestions) ? (data.suggestions as string[]) : [],
      pattern_detected: data.pattern_detected ?? "",
      contribution_levels: Array.isArray(data.contribution_levels) ? (data.contribution_levels as string[]) : [],
      created_at: data.created_at,
    };

    cacheDailyAnalysis(saved);
    saveDailyAnalysis(saved);
    return saved;
  } catch {
    return localSaved;
  }
};

export interface MonthlyReviewRow {
  id: string;
  profile_id: string;
  month_start: string;
  answers: Record<string, string>;
  created_at: string;
}

export const fetchMonthlyReviewsFromDb = async (): Promise<MonthlyReviewRow[]> => {
  const profileId = await getAuthedProfileId();
  const { data, error } = await supabase
    .from("monthly_reviews")
    .select("id, profile_id, month_start, answers, created_at")
    .eq("profile_id", profileId)
    .order("month_start", { ascending: true });
  if (error) throw error;
  return (data ?? []) as MonthlyReviewRow[];
};

export const saveMonthlyReviewToDb = async (review: Omit<MonthlyReviewRow, "id" | "profile_id" | "created_at">) => {
  const profileId = await getAuthedProfileId();
  const existing = await supabase
    .from("monthly_reviews")
    .select("id")
    .eq("profile_id", profileId)
    .eq("month_start", review.month_start)
    .maybeSingle();
  if (existing.error) throw existing.error;
  if (existing.data) {
    throw new Error("You've already completed this month's review.");
  }
  const payload = {
    profile_id: profileId,
    month_start: review.month_start,
    answers: review.answers,
  };
  const { data, error } = await supabase
    .from("monthly_reviews")
    .upsert(payload, { onConflict: "profile_id,month_start" })
    .select("id, profile_id, month_start, answers, created_at")
    .single();
  if (error) throw error;
  return data as MonthlyReviewRow;
};

export const fetchMonthlyReviewForMonthFromDb = async (monthStart: string): Promise<MonthlyReviewRow | null> => {
  const profileId = await getAuthedProfileId();
  const { data, error } = await supabase
    .from("monthly_reviews")
    .select("id, profile_id, month_start, answers, created_at")
    .eq("profile_id", profileId)
    .eq("month_start", monthStart)
    .maybeSingle();
  if (error) throw error;
  return (data as MonthlyReviewRow | null) ?? null;
};

export interface UserPreferencesRow {
  profile_id: string;
  gaming_is_distraction: boolean | null;
  created_at: string;
  updated_at: string;
}

export const fetchUserPreferencesFromDb = async (): Promise<UserPreferencesRow | null> => {
  const profileId = await getAuthedProfileId();
  const { data, error } = await supabase
    .from("user_preferences")
    .select("profile_id, gaming_is_distraction, created_at, updated_at")
    .eq("profile_id", profileId)
    .maybeSingle();
  if (error) throw error;
  return (data as UserPreferencesRow | null) ?? null;
};

export const saveUserPreferencesToDb = async (prefs: UserPreferences) => {
  const profileId = await getAuthedProfileId();
  const payload = {
    profile_id: profileId,
    gaming_is_distraction: prefs.gaming_is_distraction ?? true,
  };
  const { data, error } = await supabase
    .from("user_preferences")
    .upsert(payload, { onConflict: "profile_id" })
    .select("profile_id, gaming_is_distraction, created_at, updated_at")
    .single();
  if (error) throw error;
  return data as UserPreferencesRow;
};

export interface DbHistoryEntry extends DayEntry {
  log_id: string;
  productive_minutes: number;
  distraction_minutes: number;
  neutral_minutes: number;
  untracked_minutes: number;
}

const summarizeDay = (score: number) => {
  if (score > 70) return "Strong day. Sleep and focus aligned.";
  if (score > 45) return "Mixed day. Distraction was the leak.";
  return "Weak day. Recovery first, output second.";
};

export const buildHistoryFromDb = (logs: DailyLog[], sessions: ActivitySession[], goals: Goal[] = []) => {
  return logs.map((log) => {
    const daySessions = sessions.filter((session) => session.log_id === log.id);
    const metrics = computeMetrics(log, daySessions, goals);
    const sleep = (() => {
      const [wh, wm] = log.wake_time.split(":").map(Number);
      const [sh, sm] = log.sleep_time.split(":").map(Number);
      let awake = sh * 60 + sm - (wh * 60 + wm);
      if (awake <= 0) awake += 24 * 60;
      return +(awake / 60).toFixed(1);
    })();
    return {
      log_id: log.id,
      date: log.date,
      sleep,
      focus: +(metrics.productive / 60).toFixed(1),
      distraction: +(metrics.distraction / 60).toFixed(1),
      energy: Math.max(1, Math.min(5, Math.round((metrics.goalScore + metrics.efficiencyScore) / 40) || 1)),
      score: Math.max(0, Math.min(100, Math.round(metrics.efficiencyScore * 0.65 + metrics.goalScore * 0.35))),
      summary: summarizeDay(Math.max(0, Math.min(100, Math.round(metrics.efficiencyScore * 0.65 + metrics.goalScore * 0.35)))),
      productive_minutes: metrics.productive,
      distraction_minutes: metrics.distraction,
      neutral_minutes: metrics.neutral,
      untracked_minutes: metrics.untracked,
    } satisfies DbHistoryEntry;
  });
};

export const weeklyFromHistory = (history: DbHistoryEntry[]) => {
  const all = history.slice(-7);
  const avg = (selector: (entry: DbHistoryEntry) => number) =>
    all.length ? +(all.reduce((sum, entry) => sum + selector(entry), 0) / all.length).toFixed(1) : 0;
  return {
    days: all,
    avgSleep: avg((entry) => entry.sleep),
    avgFocus: avg((entry) => entry.focus),
    avgDistraction: avg((entry) => entry.distraction),
    avgScore: Math.round(avg((entry) => entry.score)),
  };
};
