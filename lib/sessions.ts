// Session-based time logging model (frontend / localStorage only)
// Mirrors the schema: daily_logs, activity_sessions, goals, goal_activity_map, daily_analysis

export type SessionCategory = "productive" | "neutral" | "distraction";

export interface ActivitySession {
  id: string;
  log_id: string;
  title: string;
  category: SessionCategory;
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
  created_at: string;
}

export interface Goal {
  id: string;
  title: string;
  type: "short_term" | "long_term";
  category: string; // e.g. football, study, health
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
  created_at: string;
}

const KEYS = {
  logs: "lyfopt:logs",
  sessions: "lyfopt:sessions",
  goals: "lyfopt:goals",
  prefs: "lyfopt:prefs",
  monthly: "lyfopt:monthly",
  analysis: "lyfopt:analysis",
};

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
  s: Omit<ActivitySession, "id" | "created_at" | "duration_minutes"> & { category?: SessionCategory },
): ActivitySession => {
  const duration = Math.max(
    0,
    Math.round((new Date(s.end_time).getTime() - new Date(s.start_time).getTime()) / 60000),
  );

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
    duration_minutes: duration,
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
    is_active: true,
    created_at: new Date().toISOString(),
    keywords: ["football", "soccer", "training"],
  },
  {
    id: uid(),
    title: "Study consistently",
    type: "long_term",
    category: "study",
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
      const prev = new Date(lastDate);
      prev.setDate(prev.getDate() + 1);
      const expected = prev.toISOString().slice(0, 10);
      if (d === expected) current += 1;
      else current = 1;
    }
    best = Math.max(best, current);
    lastDate = d;
  }

  // current streak up to today
  let currentUpToToday = 0;
  const today = new Date();
  let cursor = new Date(today);
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
