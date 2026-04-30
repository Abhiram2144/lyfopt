// Mock historical data for dashboard visualizations.
// Frontend-only — deterministic so the UI stays stable across renders.

export interface DayEntry {
  date: string; // ISO date
  sleep: number;
  focus: number;
  distraction: number;
  energy: number; // 1-5
  score: number; // 0-100
  summary: string;
}

const seed = (i: number) => {
  const x = Math.sin(i * 9301 + 49297) * 233280;
  return x - Math.floor(x);
};

export const generateHistory = (days = 90): DayEntry[] => {
  const out: DayEntry[] = [];
  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const r = seed(i + 1);
    const sleep = +(5 + r * 4).toFixed(1);
    const focus = +(0.5 + seed(i + 17) * 5).toFixed(1);
    const distraction = +(0.5 + seed(i + 31) * 3.5).toFixed(1);
    const energy = Math.max(1, Math.min(5, Math.round(1 + seed(i + 53) * 4)));
    const score = Math.round(
      Math.max(
        0,
        Math.min(100, sleep * 7 + focus * 8 - distraction * 9 + energy * 5 + 10),
      ),
    );
    out.push({
      date: d.toISOString().slice(0, 10),
      sleep,
      focus,
      distraction,
      energy,
      score,
      summary:
        score > 70
          ? "Strong day. Sleep and focus aligned."
          : score > 45
            ? "Mixed day. Distraction was the leak."
            : "Weak day. Recovery first, output second.",
    });
  }
  return out;
};

export const todayMetrics = () => {
  const h = generateHistory(1)[0];
  return h;
};

export const weekly = () => {
  const all = generateHistory(7);
  const avg = (k: keyof DayEntry) =>
    +(all.reduce((s, d) => s + (d[k] as number), 0) / all.length).toFixed(1);
  return {
    days: all,
    avgSleep: avg("sleep"),
    avgFocus: avg("focus"),
    avgDistraction: avg("distraction"),
    avgScore: Math.round(avg("score")),
  };
};
