import { computeMetrics, fmtMins, todayDate, type ActivitySession, type DailyLog, type Goal } from "@/lib/sessions";

export type AnalyzeTone = "strict" | "balanced" | "motivational";
export type AnalyzeMood = "low" | "neutral" | "good";
export type SessionCategory = "dopamine" | "physical" | "deep_work" | "entertainment" | "general";

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
    recentPatterns?: {
        recurringProblems: string[];
        recurringWins: string[];
        consistencyScore: number;
        last7DayAverage: number;
    };
}

export interface AnalyzeDayResult {
    summary: string;
    core_problem: string;
    key_action: string;
    positives: string[];
    problems: string[];
    suggestions: string[];
    pattern_detected: string;
    contribution_levels?: string[];
}

export type AnalyzeSource = "openai" | "fallback";

export interface AnalyzeDayMeta {
    source: AnalyzeSource;
}

export interface BehavioralSignals {
    lateWakeup: boolean;
    lateSleep: boolean;
    fragmentedWork: boolean;
    excessiveEntertainment: boolean;
    noDeepWork: boolean;
    taskSwitching: boolean;
    highDistractionClusters: boolean;
    signals: string[];
}

export interface GoalAlignment {
    alignmentPercentage: number;
    alignedActivities: string[];
    unalignedActivities: string[];
}

export interface TemporalPatterns {
    peakFocusWindow: string;
    distractionCluster: string;
    longestDeepWorkBlock: string;
    earlyMorningActivity: boolean;
    lateNightActivity: boolean;
}

const sanitizeText = (value: unknown) => (typeof value === "string" ? value.trim() : "");

const cleanArray = (value: unknown) => (Array.isArray(value) ? value.map((item) => sanitizeText(item)).filter(Boolean) : []);

const toSentence = (value: string) => {
    if (!value) return "";
    return /[.!?]$/.test(value) ? value : `${value}.`;
};

const classifyContribution = (title: string, goalTitle: string, minutes: number) => {
    const text = `${title} ${goalTitle}`.toLowerCase();
    const relevant = /coding|study|research|project|build|design|write|learn|develop|practice|ai|ml/.test(text);
    const longBlock = minutes >= 90;
    const exactMatch = title.toLowerCase().includes(goalTitle.toLowerCase()) || goalTitle.toLowerCase().includes(title.toLowerCase());

    if (exactMatch || (relevant && longBlock)) return "strong contribution";
    if (relevant || minutes >= 45) return "moderate contribution";
    return "weak contribution";
};

/**
 * Parse hour from HH:MM format
 */
const parseHour = (timeStr: string): number => {
    try {
        const [hour] = timeStr.split(":").map(Number);
        return hour ?? 0;
    } catch {
        return 0;
    }
};

/**
 * Classify a session by its title to detect behavior patterns
 */
const classifySession = (title: string): SessionCategory => {
    const t = title.toLowerCase();

    if (t.includes("youtube") || t.includes("instagram") || t.includes("tiktok") || t.includes("reddit"))
        return "dopamine";

    if (t.includes("gym") || t.includes("football") || t.includes("run") || t.includes("exercise") || t.includes("walk"))
        return "physical";

    if (
        t.includes("study") ||
        t.includes("deep work") ||
        t.includes("coding") ||
        t.includes("writing") ||
        t.includes("research")
    )
        return "deep_work";

    if (t.includes("gaming") || t.includes("game") || t.includes("play"))
        return "entertainment";

    return "general";
};

/**
 * Detect behavioral signals from daily log and sessions
 */
const detectBehavioralSignals = (payload: AnalyzeDayPayload): BehavioralSignals => {
    const wakeHour = parseHour(payload.dailyLog.wake_time);
    const sleepHour = parseHour(payload.dailyLog.sleep_time);

    const lateWakeup = wakeHour > 10;
    const lateSleep = sleepHour > 1 && sleepHour < 6; // 1AM-6AM

    // Check for fragmented work
    const deepWorkSessions = payload.sessions.filter((s) => classifySession(s.title) === "deep_work");
    const fragmentedWork = deepWorkSessions.length > 3; // More than 3 deep work blocks = fragmented

    // Check for excessive entertainment
    const entertainmentSessions = payload.sessions.filter((s) => classifySession(s.title) === "entertainment");
    const dopamineSessions = payload.sessions.filter((s) => classifySession(s.title) === "dopamine");
    const excessiveEntertainment = entertainmentSessions.length + dopamineSessions.length > 3;

    const noDeepWork = deepWorkSessions.length === 0;

    // Task switching: many short sessions
    const taskSwitching = payload.sessions.length > 8;

    const signals: string[] = [];
    if (lateWakeup) signals.push("Woke up late (after 10 AM)");
    if (lateSleep) signals.push("Slept late (after 1 AM)");
    if (fragmentedWork) signals.push("Deep work sessions fragmented across day");
    if (excessiveEntertainment) signals.push("Multiple entertainment/dopamine sessions");
    if (noDeepWork) signals.push("No dedicated deep work time");
    if (taskSwitching) signals.push("High task switching detected");

    // Distraction clusters (many dopamine sessions in late hours)
    const lateNightDopamine = payload.sessions.filter(
        (s) => (classifySession(s.title) === "dopamine" || classifySession(s.title) === "entertainment") && parseHour(s.start_time) > 22
    );
    const highDistractionClusters = lateNightDopamine.length >= 2;
    if (highDistractionClusters) signals.push("Distraction cluster detected late night (10 PM+)");

    return {
        lateWakeup,
        lateSleep,
        fragmentedWork,
        excessiveEntertainment,
        noDeepWork,
        taskSwitching,
        highDistractionClusters,
        signals,
    };
};

/**
 * Calculate which sessions align with stated goals
 */
const calculateGoalAlignment = (payload: AnalyzeDayPayload): GoalAlignment => {
    if (!payload.goals.length) {
        return {
            alignmentPercentage: 0,
            alignedActivities: [],
            unalignedActivities: [],
        };
    }

    const goalTitlesLower = payload.goals.map((g) => g.title.toLowerCase());
    const alignedActivities: string[] = [];
    const unalignedActivities: string[] = [];

    payload.sessions.forEach((session) => {
        const sessionTitleLower = session.title.toLowerCase();
        const isAligned = goalTitlesLower.some((goal) => sessionTitleLower.includes(goal) || goal.includes(sessionTitleLower));

        if (isAligned) {
            alignedActivities.push(session.title);
        } else {
            unalignedActivities.push(session.title);
        }
    });

    const alignmentPercentage =
        payload.sessions.length > 0 ? Math.round((alignedActivities.length / payload.sessions.length) * 100) : 0;

    return {
        alignmentPercentage,
        alignedActivities: [...new Set(alignedActivities)],
        unalignedActivities: [...new Set(unalignedActivities)],
    };
};

/**
 * Detect temporal patterns: peak hours, distraction windows, deep work blocks
 */
const detectTemporalPatterns = (payload: AnalyzeDayPayload): TemporalPatterns => {
    const deepWorkSessions = payload.sessions.filter((s) => classifySession(s.title) === "deep_work");
    const entertainmentSessions = payload.sessions.filter(
        (s) => classifySession(s.title) === "dopamine" || classifySession(s.title) === "entertainment"
    );

    // Find peak focus window (when deep work happens)
    let peakFocusWindow = "Not detected";
    if (deepWorkSessions.length > 0) {
        const firstDeepWork = deepWorkSessions[0];
        const deepWorkHour = parseHour(firstDeepWork.start_time);
        if (deepWorkHour >= 6 && deepWorkHour < 12) peakFocusWindow = "Early morning (6 AM–12 PM)";
        else if (deepWorkHour >= 12 && deepWorkHour < 18) peakFocusWindow = "Afternoon (12 PM–6 PM)";
        else if (deepWorkHour >= 18) peakFocusWindow = "Evening (6 PM–11 PM)";
    }

    // Find distraction cluster
    let distractionCluster = "Not detected";
    if (entertainmentSessions.length > 0) {
        const avgHour = Math.round(
            entertainmentSessions.reduce((sum, s) => sum + parseHour(s.start_time), 0) / entertainmentSessions.length
        );
        if (avgHour >= 22 || avgHour < 6) distractionCluster = "Late night (10 PM–6 AM)";
        else if (avgHour >= 12 && avgHour < 18) distractionCluster = "Afternoon slump (12 PM–6 PM)";
        else distractionCluster = `Around ${avgHour}:00`;
    }

    // Longest deep work block
    let longestDeepWorkBlock = "0 min";
    if (deepWorkSessions.length > 0) {
        const durations = deepWorkSessions.map((s) => {
            const [startHour, startMin] = s.start_time.split(":").map(Number);
            const [endHour, endMin] = s.end_time.split(":").map(Number);
            return (endHour - startHour) * 60 + (endMin - startMin);
        });
        const maxDuration = Math.max(...durations);
        longestDeepWorkBlock = fmtMins(maxDuration);
    }

    const earlyMorningActivity = payload.sessions.some((s) => {
        const hour = parseHour(s.start_time);
        return hour < 6;
    });

    const lateNightActivity = payload.sessions.some((s) => {
        const hour = parseHour(s.start_time);
        return hour > 22;
    });

    return {
        peakFocusWindow,
        distractionCluster,
        longestDeepWorkBlock,
        earlyMorningActivity,
        lateNightActivity,
    };
};

const normalizeResult = (value: unknown): AnalyzeDayResult | null => {
    if (!value || typeof value !== "object") return null;
    const record = value as Record<string, unknown>;

    const overall = record.overall && typeof record.overall === "object" ? (record.overall as Record<string, unknown>) : null;
    const goalAlignment =
        record.goal_alignment && typeof record.goal_alignment === "object"
            ? (record.goal_alignment as Record<string, unknown>)
            : null;
    const activities = record.activities && typeof record.activities === "object" ? (record.activities as Record<string, unknown>) : null;
    const observations = Array.isArray(record.observations) ? record.observations : [];

    const summary =
        sanitizeText(record.summary) ||
        [
            sanitizeText(record.goal_contribution || overall?.goal_contribution || goalAlignment?.alignment_today),
            sanitizeText(record.goal_linked_minutes || record.time_spent_on_goal_linked_work || overall?.goal_linked_minutes || goalAlignment?.goal_linked_minutes),
            sanitizeText(record.top_unaligned_activity || record.biggest_unaligned_activity || overall?.top_unaligned_activity || goalAlignment?.top_unaligned_activity),
        ]
            .filter(Boolean)
            .join(" | ");

    const coreProblem =
        sanitizeText(record.core_problem) ||
        sanitizeText(record.top_unaligned_activity) ||
        sanitizeText(record.biggest_unaligned_activity) ||
        sanitizeText(overall?.top_unaligned_activity) ||
        sanitizeText(goalAlignment?.top_unaligned_activity) ||
        (sanitizeText(record.goal_contribution || overall?.goal_contribution || goalAlignment?.alignment_today) === "0%"
            ? "None of today's logged work clearly supported your stated goals"
            : "");

    const keyAction =
        sanitizeText(record.key_action) ||
        (sanitizeText(record.top_goal)
            ? `Protect a focused block for ${sanitizeText(record.top_goal)} tomorrow`
            : coreProblem
                ? "Schedule your next block around the most goal-linked activity and cut the main unaligned one"
                : "");

    const patternDetected =
        sanitizeText(record.pattern_detected) ||
        sanitizeText(record.consistency) ||
        "No specific pattern detected.";

    const positives = cleanArray(record.positives);
    const problems =
        cleanArray(record.problems).length > 0
            ? cleanArray(record.problems)
            : cleanArray(record.unaligned_activities).length > 0
                ? cleanArray(record.unaligned_activities)
                : [coreProblem].filter(Boolean);

    const suggestions =
        cleanArray(record.suggestions).length > 0
            ? cleanArray(record.suggestions)
            : [keyAction].filter(Boolean);

    const observedContributionLevels = observations
        .map((item) => {
            if (!item || typeof item !== "object") return "";
            const observation = item as Record<string, unknown>;
            const activity = sanitizeText(observation.activity);
            const duration = sanitizeText(observation.duration);
            const contribution = sanitizeText(observation.contribution);
            if (!activity && !contribution) return "";
            return [activity, duration ? `(${duration})` : "", contribution ? `- ${contribution}` : ""].filter(Boolean).join(" ");
        })
        .filter(Boolean);

    const activityContributionLevels = activities
        ? Object.entries(activities)
              .map(([key, item]) => {
                  if (!item || typeof item !== "object") return "";
                  const activity = key.replace(/_/g, " ");
                  const details = item as Record<string, unknown>;
                  const duration = sanitizeText(details.duration);
                  const contribution = sanitizeText(details.contribution);
                  if (!contribution) return "";
                  return [activity, duration ? `(${duration})` : "", `- ${contribution}`].filter(Boolean).join(" ");
              })
              .filter(Boolean)
        : [];

    const contributionLevels = cleanArray(record.contribution_levels);
    const normalizedContributionLevels =
        contributionLevels.length > 0 ? contributionLevels : [...observedContributionLevels, ...activityContributionLevels];

    if (!summary || !coreProblem || !keyAction) return null;

    return {
        summary: toSentence(summary),
        core_problem: toSentence(coreProblem),
        key_action: toSentence(keyAction),
        positives,
        problems,
        suggestions,
        pattern_detected: toSentence(patternDetected),
        ...(normalizedContributionLevels.length ? { contribution_levels: normalizedContributionLevels } : {}),
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

export const buildContext = (payload: AnalyzeDayPayload) => {
    // Compute metrics using the same logic as fallback
    const referenceLog: DailyLog = {
        id: "analysis-context",
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
    const signals = detectBehavioralSignals(payload);
    const alignment = calculateGoalAlignment(payload);
    const temporal = detectTemporalPatterns(payload);

    const wakeToSleep = `${payload.dailyLog.wake_time} → ${payload.dailyLog.sleep_time}`;

    // Classify sessions
    const sessionSummary = payload.sessions
        .map((s) => {
            const status = s.intentional ? "planned" : "unplanned";
            const category = classifySession(s.title);
            const diff = s.difficulty ? ` (difficulty: ${s.difficulty})` : "";
            return `• ${s.title || "Session"} ${s.start_time}–${s.end_time}\n  Category: ${category} | Intentional: ${status}${diff}`;
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

=== COMPUTED METRICS ===
Productive Time: ${fmtMins(metrics.productive)}
Distraction Time: ${fmtMins(metrics.distraction)}
Untracked Time: ${fmtMins(metrics.untracked)}
Goal Alignment Score: ${metrics.goalScore}%
Efficiency Score: ${metrics.efficiencyScore}%
Awake Duration: ${fmtMins(metrics.awakeMinutes)}

=== SESSIONS LOGGED (CLASSIFIED) ===
${sessionSummary || "(none logged)"}

=== GOALS ===
${goalsSummary || "(none defined)"}

=== GOAL ALIGNMENT ANALYSIS ===
${alignment.alignmentPercentage}% of sessions supported stated goals.
Aligned activities: ${alignment.alignedActivities.join(", ") || "none"}
Unrelated activities: ${alignment.unalignedActivities.join(", ") || "none"}

=== TEMPORAL PATTERNS ===
Peak focus window: ${temporal.peakFocusWindow}
Distraction cluster: ${temporal.distractionCluster}
Longest deep work block: ${temporal.longestDeepWorkBlock}

=== DETECTED BEHAVIORAL SIGNALS ===
${signals.signals.map((s) => `- ${s}`).join("\n") || "- No significant patterns detected"}

${payload.userProfile ? `\n=== USER PROFILE ===
Tone: ${payload.userProfile.tone}
Strengths: ${payload.userProfile.strengths.join(", ") || "not captured"}
Growth areas: ${payload.userProfile.weaknesses.join(", ") || "not captured"}` : ""}

${
    payload.recentPatterns
        ? `\n=== RECENT HISTORY (LAST 7 DAYS) ===
Consistency Score: ${payload.recentPatterns.consistencyScore}%
7-Day Average Performance: ${payload.recentPatterns.last7DayAverage}%
Recurring wins: ${payload.recentPatterns.recurringWins.join(", ") || "none identified"}
Recurring problems: ${payload.recentPatterns.recurringProblems.join(", ") || "none identified"}`
        : ""
}

${payload.pastSummary ? `\n=== PREVIOUS ANALYSIS (FOR CONTINUITY) ===
${payload.pastSummary}` : ""}
`;
};

const buildSystemPrompt = (): string => {
    return `You are an intelligent goal alignment assistant.

Your role is to determine whether the user's daily activities contributed toward their stated goals.

Return exactly one JSON object with these keys:
- summary: string
- core_problem: string
- key_action: string
- positives: string[]
- problems: string[]
- suggestions: string[]
- pattern_detected: string
- contribution_levels: string[]

Rules:
- Use the exact key names above.
- Do not add wrapper objects like "overall", "goal_alignment", or "activities".
- Do not rename fields.
- Keep every string concise, concrete, and direct.
- Focus on contribution, consistency, alignment, and progress.
- Avoid generic motivation, therapy language, and psychological analysis.
- If there is little or no goal-linked work, say that plainly in summary, core_problem, and key_action.`;
};

const buildUserContext = (payload: AnalyzeDayPayload): string => {
    const totalAlignedMinutes = payload.sessions
        .filter((session) => !!payload.goals.find((goal) => session.title.toLowerCase().includes(goal.title.toLowerCase())))
        .reduce((sum, session) => sum + session.duration_minutes, 0);

    const totalMinutes = payload.sessions.reduce((sum, session) => sum + session.duration_minutes, 0);
    const alignmentPercent = totalMinutes > 0 ? Math.round((totalAlignedMinutes / totalMinutes) * 100) : 0;
    const goalList = payload.goals.map((goal) => `- ${goal.title} (${goal.priority})`).join("\n") || "- None";
    const sessionList = payload.sessions
        .map((session) => {
            const goal = payload.goals.find((item) => session.title.toLowerCase().includes(item.title.toLowerCase()));
            const contribution = goal ? classifyContribution(session.title, goal.title, session.duration_minutes) : "unrelated";
            return `- ${session.title} (${fmtMins(session.duration_minutes)}) · ${contribution}${goal ? ` → ${goal.title}` : ""}`;
        })
        .join("\n") || "- No sessions logged";

    const userContextLines = [
        `=== GOAL ALIGNMENT INPUT ===
Alignment today: ${alignmentPercent}%
Goal-linked minutes: ${fmtMins(totalAlignedMinutes)}
Total logged minutes: ${fmtMins(totalMinutes)}

Goals:
${goalList}

Sessions:
${sessionList}

Recent summary: ${payload.pastSummary || "none"}

Recent patterns: ${payload.recentPatterns ? `consistency ${payload.recentPatterns.consistencyScore}%, 7-day average ${payload.recentPatterns.last7DayAverage}%` : "none"}

Output rules:
- Keep it short
- Use simple, direct language
- Focus on goal contribution
- Classify meaningful activities as strong contribution, moderate contribution, weak contribution, or unrelated
- Mention the top goal or the biggest unaligned activity when relevant
- Return only JSON
- Use this exact schema:
{
  "summary": "string",
  "core_problem": "string",
  "key_action": "string",
  "positives": ["string"],
  "problems": ["string"],
  "suggestions": ["string"],
  "pattern_detected": "string",
  "contribution_levels": ["string"]
}`,
    ];

    return userContextLines.join("\n");
};

const buildPrompt = (payload: AnalyzeDayPayload, isRetry = false): string => {
    const systemPrompt = buildSystemPrompt();
    const userContext = buildUserContext(payload);

    return `${systemPrompt}\n\n${userContext}${isRetry ? "\n\nRetry: return only JSON." : ""}`;
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
export { 
    buildPrompt, 
    extractJson, 
    normalizeResult,
    buildSystemPrompt,
    buildUserContext,
    classifySession,
    detectBehavioralSignals,
    calculateGoalAlignment,
    detectTemporalPatterns,
};
