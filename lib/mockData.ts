import type { DayEntry } from "@/lib/sessions";

export const generateHistory = (entries: DayEntry[] = []): DayEntry[] => entries;

export const todayMetrics = (entries: DayEntry[] = []) => entries[entries.length - 1] ?? null;

export const weekly = (entries: DayEntry[] = []) => {
  const all = entries.slice(-7);
  const avg = (k: keyof DayEntry) =>
    all.length ? +(all.reduce((s, d) => s + (d[k] as number), 0) / all.length).toFixed(1) : 0;
  return {
    days: all,
    avgSleep: avg("sleep"),
    avgFocus: avg("focus"),
    avgDistraction: avg("distraction"),
    avgScore: Math.round(avg("score")),
  };
};
