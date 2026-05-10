import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { GoalPriority, GoalTimeHorizon } from "@/lib/sessions";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const normalizeWord = (value: string) => value.trim().toLowerCase();

const unique = (values: string[]) => Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));

export function inferGoalDraft(input: string) {
  const raw = input.trim();
  const text = raw.toLowerCase();

  const category =
    text.includes("football") || text.includes("soccer")
      ? "football"
      : text.includes("gym") || text.includes("fitness") || text.includes("health")
        ? "health"
        : text.includes("study") || text.includes("learn") || text.includes("course")
          ? "learning"
          : text.includes("code") || text.includes("build") || text.includes("project")
            ? "craft"
            : "general";

  const title = raw || "Become more consistent";
  const type: "short_term" | "long_term" = /this week|this month|finish|ship|launch|complete/.test(text) ? "short_term" : "long_term";
  const priority: GoalPriority = /elite|serious|must|main|core/.test(text) ? "high" : /maybe|explore/.test(text) ? "low" : "medium";
  const timeHorizon: GoalTimeHorizon = /daily|every day/.test(text) ? "daily" : /weekly|week/.test(text) ? "weekly" : "long-term";
  const identityTag =
    category === "football"
      ? "An athlete who trains with intention."
      : category === "health"
        ? "A person who protects recovery and physical standards."
        : category === "learning"
          ? "A learner who shows up even when motivation dips."
          : category === "craft"
            ? "A builder who turns focused time into visible progress."
            : "A person who acts in line with what matters.";

  const seedKeywords = unique(
    raw
      .replace(/[^a-zA-Z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((word) => word.length > 3),
  );

  const categoryKeywords: Record<string, string[]> = {
    football: ["football", "training", "recovery", "match", "fitness"],
    health: ["gym", "sleep", "recovery", "nutrition", "walk"],
    learning: ["study", "reading", "course", "practice", "notes"],
    craft: ["coding", "build", "project", "deep work", "design"],
    general: ["focus", "consistency", "progress"],
  };

  return {
    title,
    category,
    type,
    priority,
    timeHorizon,
    identityTag,
    keywords: unique([...seedKeywords, ...categoryKeywords[category]]).slice(0, 8),
    openEnded: !/\b\d+/.test(text),
  };
}

const formatTimeValue = (hours: number, minutes: number) =>
  `${String(((hours % 24) + 24) % 24).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;

const parseTimeToken = (token: string) => {
  const cleaned = normalizeWord(token).replace(/\./g, "");
  const match = cleaned.match(/^(\d{1,2})(?::(\d{2}))?(am|pm)?$/);
  if (!match) return null;

  let hours = Number(match[1]);
  const minutes = Number(match[2] ?? 0);
  const meridiem = match[3];

  if (meridiem === "pm" && hours < 12) hours += 12;
  if (meridiem === "am" && hours === 12) hours = 0;

  return formatTimeValue(hours, minutes);
};

const addMinutes = (time: string, minutesToAdd: number) => {
  const [hours, minutes] = time.split(":").map(Number);
  const total = hours * 60 + minutes + minutesToAdd;
  return formatTimeValue(Math.floor(total / 60), total % 60);
};

export function parseSessionCapture(input: string, fallbackStart: string) {
  const raw = input.trim();
  if (!raw) return null;

  const rangeMatch = raw.match(/(.+?)\s+(\d{1,2}(?::\d{2})?\s?(?:am|pm)?)\s*(?:to|-)\s*(\d{1,2}(?::\d{2})?\s?(?:am|pm)?)/i);
  if (rangeMatch) {
    const title = rangeMatch[1].trim();
    const start = parseTimeToken(rangeMatch[2].replace(/\s+/g, ""));
    const end = parseTimeToken(rangeMatch[3].replace(/\s+/g, ""));
    if (title && start && end) {
      return { title, start, end };
    }
  }

  const durationMatch = raw.match(/(.+?)\s+(\d+)\s*(h|hr|hrs|hour|hours|m|min|mins|minute|minutes)\b/i);
  if (durationMatch) {
    const title = durationMatch[1].trim();
    const amount = Number(durationMatch[2]);
    const unit = durationMatch[3].toLowerCase();
    const minutes = unit.startsWith("h") ? amount * 60 : amount;
    if (title && minutes > 0) {
      return { title, start: fallbackStart, end: addMinutes(fallbackStart, minutes) };
    }
  }

  return { title: raw, start: fallbackStart, end: addMinutes(fallbackStart, 60) };
}
