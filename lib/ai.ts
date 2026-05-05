import { computeMetrics, fmtMins, todayDate, type ActivitySession, type DailyLog, type Goal } from "@/lib/sessions";

export type AnalyzeTone = "strict" | "balanced" | "motivational";
export type AnalyzeMood = "low" | "neutral" | "good";

export interface AnalyzeDayPayload {
    sessions: ActivitySession[];
    goals: Goal[];
    dailyLog: {
        wake_time: string;
        sleep_time: string;
        energy_level: number;
        focus_level: number;
        mood: AnalyzeMood;
        day_rating: number;
    };
    userProfile?: {
        tone: AnalyzeTone;
        weaknesses: string[];
        strengths: string[];
    };
    pastSummary?: string;
}

export interface AnalyzeDayResult {
    summary: string;
    core_problem: string;
    key_action: string;
    positives: string[];
    problems: string[];
    suggestions: string[];
    pattern_detected: string;
}

export type AnalyzeSource = "gemini" | "fallback";

export interface AnalyzeDayMeta {
    source: AnalyzeSource;
}

const OUTPUT_KEYS = [
    "summary",
    "core_problem",
    "key_action",
    "positives",
    "problems",
    "suggestions",
    "pattern_detected",
] as const;

const sanitizeText = (value: unknown) => (typeof value === "string" ? value.trim() : "");

const cleanArray = (value: unknown) => (Array.isArray(value) ? value.map((item) => sanitizeText(item)).filter(Boolean) : []);

const normalizeResult = (value: unknown): AnalyzeDayResult | null => {
    if (!value || typeof value !== "object") return null;
    const record = value as Record<string, unknown>;

    // RELAXED VALIDATION: require only critical fields
    const summary = sanitizeText(record.summary);
    const coreProblem = sanitizeText(record.core_problem);
    const keyAction = sanitizeText(record.key_action);
    const patternDetected = sanitizeText(record.pattern_detected);
    const positives = cleanArray(record.positives);
    const problems = cleanArray(record.problems);
    const suggestions = cleanArray(record.suggestions);

    // Only require these three critical fields
    if (!summary || !coreProblem || !keyAction) return null;

    return {
        summary,
        core_problem: coreProblem,
        key_action: keyAction,
        positives,
        problems,
        suggestions,
        pattern_detected: patternDetected || "No specific pattern detected.",
    };
};

const extractJson = (text: string): string | null => {
    if (!text?.trim()) return null;
    
    // Step 1: Extract from markdown code fences
    const trimmed = text.trim();
    const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
    const raw = fenced?.[1]?.trim() ?? trimmed;
    
    // Step 2: Find JSON boundaries
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start === -1 || end === -1 || end <= start) return null;
    
    let extracted = raw.slice(start, end + 1);
    
    // Step 3: Try direct parse first
    try {
        JSON.parse(extracted);
        return extracted;
    } catch {
        // Continue to cleaning
    }
    
    // Step 4: Clean common JSON issues
    // Remove trailing commas before } and ]
    extracted = extracted.replace(/,(\s*[}\]])/g, "$1");
    // Fix common quote issues (single quotes around values)
    extracted = extracted.replace(/:\s*'([^']*)'/g, ': "$1"');
    
    try {
        JSON.parse(extracted);
        return extracted;
    } catch {
        return null;
    }
};

const ruleBasedOutcome = (payload: AnalyzeDayPayload): AnalyzeDayResult => {
    const referenceLog: DailyLog = {
        id: "analysis-fallback",
        date: todayDate(),
        wake_time: payload.dailyLog.wake_time,
        sleep_time: payload.dailyLog.sleep_time,
        energy_level: Math.max(1, Math.min(5, Math.round(payload.dailyLog.energy_level || 3))) as 1 | 2 | 3 | 4 | 5,
        focus_level: Math.max(1, Math.min(5, Math.round(payload.dailyLog.focus_level || 3))) as 1 | 2 | 3 | 4 | 5,
        mood: payload.dailyLog.mood,
        day_rating: Math.max(1, Math.min(10, Math.round(payload.dailyLog.day_rating || 5))) as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10,
        created_at: new Date().toISOString(),
    };
    const metrics = computeMetrics(referenceLog, payload.sessions, payload.goals);
    const tone = payload.userProfile?.tone ?? "balanced";
    const hasDistraction = metrics.distraction >= 90;
    const hasUntracked = metrics.untracked > metrics.awakeMinutes * 0.25;
    const lowGoalTime = metrics.goalScore < 25;

    const positives = [] as string[];
    const problems = [] as string[];
    const suggestions = [] as string[];

    if (metrics.productive > 0) positives.push(`You protected ${fmtMins(metrics.productive)} for useful work.`);
    if (metrics.goalScore >= 25) positives.push(`${metrics.goalScore}% of the day supported your goals.`);
    if (metrics.distraction === 0) positives.push("Distraction was kept under control today.");

    if (hasDistraction) {
        problems.push(`Distraction consumed ${fmtMins(metrics.distraction)}.`);
        suggestions.push("Block the distraction source for your strongest focus window tomorrow.");
    }
    if (hasUntracked) {
        problems.push(`${fmtMins(metrics.untracked)} went untracked.`);
        suggestions.push("Log the missing hours. Hidden time is usually the real leak.");
    }
    if (lowGoalTime) {
        problems.push("Too little of the day was tied to goals.");
        suggestions.push("Lock one 60-minute block to your top goal before noon.");
    }
    if (suggestions.length === 0) {
        suggestions.push("Repeat the structure tomorrow and keep the strongest block protected.");
    }

    const summaryByTone: Record<AnalyzeTone, string> = {
        strict: `Today was ${metrics.efficiencyScore}% efficient. The truth is that your biggest issue is not effort, it is control over the wrong moments.`,
        balanced: `You had ${fmtMins(metrics.productive)} of productive time and ${fmtMins(metrics.distraction)} of distraction. The day was mixed, but the leverage point is clear.`,
        motivational: `You created real momentum today with ${fmtMins(metrics.productive)} of productive work. The next step is to make that pattern easier to repeat.`,
    };

    const coreProblem = hasDistraction
        ? "Distraction is breaking your flow and pulling time out of your best hours."
        : hasUntracked
            ? "Untracked time is hiding the real shape of your day."
            : lowGoalTime
                ? "Your day is busy, but not enough of it is aligned with the goals that matter most."
                : "No major issue stands out, but consistency is still the thing to protect.";

    const keyAction = hasDistraction
        ? "Remove the main distraction source before your next deep-work block."
        : hasUntracked
            ? "Track the invisible hours first, then optimize the rest."
            : "Repeat the structure tomorrow and make it predictable.";

    const patternDetected = hasDistraction
        ? "Distraction repeatedly clusters around the same time window and breaks momentum."
        : hasUntracked
            ? "The day loses shape when time is not deliberately assigned."
            : lowGoalTime
                ? "The day is active, but goal-aligned work is not yet a strong habit."
                : "The strongest pattern is that good structure produces a more usable day.";

    return {
        summary: summaryByTone[tone],
        core_problem: coreProblem,
        key_action: keyAction,
        positives,
        problems,
        suggestions,
        pattern_detected: patternDetected,
    };
};

const buildContext = (payload: AnalyzeDayPayload) => {
    const wakeToSleep = `${payload.dailyLog.wake_time} → ${payload.dailyLog.sleep_time}`;
    
    const sessionSummary = payload.sessions
        .map((s) => {
            const status = s.intentional ? "planned" : "unplanned";
            const diff = s.difficulty ? ` (difficulty: ${s.difficulty})` : "";
            return `• ${s.title || "Session"} ${s.start_time}–${s.end_time} [${status}${diff}]`;
        })
        .join("\n");

    const goalsSummary = payload.goals
        .map((g) => `• ${g.title} (priority: ${g.priority}, horizon: ${g.time_horizon})`)
        .join("\n");

    return `
=== DAY SNAPSHOT ===
Time: ${wakeToSleep}
Energy: ${payload.dailyLog.energy_level}/5 | Focus: ${payload.dailyLog.focus_level}/5
Mood: ${payload.dailyLog.mood} | Day Rating: ${payload.dailyLog.day_rating}/10

=== SESSIONS LOGGED ===
${sessionSummary || "(none logged)"}

=== GOALS ===
${goalsSummary || "(none defined)"}
${payload.userProfile ? `\n=== USER PROFILE ===
Tone: ${payload.userProfile.tone}
Strengths: ${payload.userProfile.strengths.join(", ") || "not captured"}
Growth areas: ${payload.userProfile.weaknesses.join(", ") || "not captured"}` : ""}
${payload.pastSummary ? `\n=== PREVIOUS SUMMARY (for continuity) ===
${payload.pastSummary}` : ""}
`;
};

const buildPrompt = (payload: AnalyzeDayPayload, isRetry = false) => {
    const tone = payload.userProfile?.tone ?? "balanced";
    const toneInstructions: Record<AnalyzeTone, string> = {
        strict: "Be direct, precise, and unsparing. Focus on accountability and what the user is actually avoiding.",
        balanced: "Be honest, clear, and fair. Identify the real leverage point without being harsh.",
        motivational: "Be encouraging and forward-looking without becoming generic. Acknowledge real effort while clarifying the next step.",
    };

    const lines = [
        "You are a behavior analyst for LyfOpt, not a generic productivity assistant.",
        "Your role: identify patterns, avoidance, and leverage points in the user's actual behavior.",
        "",
        `FEEDBACK STYLE: ${toneInstructions[tone]}`,
        "",
        "=== ANALYSIS CHECKLIST (think internally, then respond) ===",
        "• Where did time actually disappear?",
        "• Did the user avoid difficult or important tasks?",
        "• How well does today's behavior align with stated goals?",
        "• What do energy and focus levels tell you about decisions made?",
        "• Is there a repeating pattern that should be called out?",
        "",
        `=== DAY DATA ===`,
        buildContext(payload),
        "",
        "=== OUTPUT INSTRUCTIONS ===",
        "You MUST respond with ONLY valid JSON, no markdown, explanation, or extra text.",
        "Response must start with { and end with }.",
        "Use exactly these keys:",
        JSON.stringify({
            summary: "1-2 sentence overview of the day's behavioral pattern",
            core_problem: "the actual issue at hand (not generic)",
            key_action: "one specific, actionable next step",
            positives: ["array of 1-3 real wins from today"],
            problems: ["array of 1-3 actual issues observed"],
            suggestions: ["array of 1-3 concrete suggestions"],
            pattern_detected: "the repeating pattern or habit you identified",
        }, null, 2),
        "",
        isRetry ? "This is a retry. Return ONLY the JSON object with no other text." : "",
    ]
        .filter(Boolean)
        .join("\n");

    return lines;
};

// Rule-based fallback (used when Gemini is unavailable or fails)
export const analyzeDayWithMeta = async (
    payload: AnalyzeDayPayload,
): Promise<{ result: AnalyzeDayResult; meta: AnalyzeDayMeta }> => {
    return { result: ruleBasedOutcome(payload), meta: { source: "fallback" } };
};

export const analyzeDay = async (payload: AnalyzeDayPayload): Promise<AnalyzeDayResult> => {
    const analyzed = await analyzeDayWithMeta(payload);
    return analyzed.result;
};

// Exported for API route usage
export { buildPrompt, extractJson, normalizeResult };
