# LyfOpt Dashboard Features & Implementation Guide

**Last Updated:** May 9, 2026  
**Status:** Production Ready  
**Version:** 2.0 (AI-Enhanced with Behavioral Intelligence)

---

## Overview

LyfOpt's dashboard is a **behavioral operating system** that transforms raw time-tracking data into actionable behavioral insights. Rather than showing generic productivity metrics, it computes behavioral patterns, detects avoidance loops, reveals energy dynamics, and identifies your highest-leverage improvement point for each day.

The system works in three layers:
1. **Raw data collection** (sessions, daily logs, goals)
2. **Computed intelligence** (metrics, patterns, signals)
3. **AI reasoning** (contextual analysis powered by GPT-4o-mini)

---

## Core Data Model

### Daily Log
Records the user's subjective state for a day:
```typescript
interface DailyLog {
  id: string;
  date: string;              // YYYY-MM-DD
  wake_time: string;         // HH:MM
  sleep_time: string;        // HH:MM
  energy_level: 1 | 2 | 3 | 4 | 5;
  focus_level: 1 | 2 | 3 | 4 | 5;
  mood: "low" | "neutral" | "good";
  day_rating: 1-10;
  created_at: string;        // ISO timestamp
}
```

### Activity Session
Time blocks logged throughout the day:
```typescript
interface ActivitySession {
  id: string;
  log_id: string;
  title: string;
  category: "productive" | "neutral" | "distraction";
  intentional: boolean;      // planned vs spontaneous
  difficulty: 1 | 2 | 3 | 4 | 5;
  start_time: string;        // ISO
  end_time: string;          // ISO
  duration_minutes: number;
  created_at: string;
}
```

### Goal
User's stated objectives:
```typescript
interface Goal {
  id: string;
  title: string;
  type: "short_term" | "long_term";
  category: string;          // e.g., "study", "health", "career"
  priority: "low" | "medium" | "high";
  time_horizon: "daily" | "weekly" | "long-term";
  identity_tag: string;      // e.g., "I am someone who shows up"
  is_active: boolean;
  keywords: string[];        // matched against session titles
  open_ended?: boolean;
  target_value?: number;     // for measurable goals
  target_unit?: string;      // e.g., "times/week"
  created_at: string;
}
```

---

## Key Dashboard Features

### 1. **Today's Analysis Card** 🎯
**What It Shows:**  
A real-time behavioral summary for today with:
- Overall efficiency score
- Time breakdown (productive, distraction, untracked)
- Goal alignment assessment
- Core problem (what's actually broken today)
- Key action (the one thing to fix tomorrow)

**How It's Implemented:**

```typescript
// From computeMetrics() in lib/sessions.ts
const metrics = computeMetrics(todayLog, todaySessions, goals);

// Returns:
{
  productive: 180,           // minutes
  distraction: 90,
  untracked: 120,
  awakeMinutes: 900,
  efficiencyScore: 72,       // (productive + neutral) / awakeMinutes * 100
  goalScore: 58,             // goal-aligned sessions / total sessions * 100
  goalBreakdown: [
    { goal_id: "x", title: "Coding", minutes: 120 }
  ]
}
```

**Core Logic:**
- **Efficiency Score** = `(productive + neutral) / awakeMinutes * 100`
- **Goal Score** = `goalAlignedMinutes / awakeMinutes * 100`
- Session categorization happens via heuristic keywords:
  - Productive: coding, study, deep work, research, writing
  - Distraction: YouTube, Instagram, TikTok, Reddit, gaming
  - Neutral: general meetings, administrative tasks

**AI Enhancement:**
The analysis card now includes insights from GPT-4o-mini powered by the new enriched context (computed metrics + behavioral signals). See section on AI Analysis Integration.

---

### 2. **Score Cards** 📊
**Four Key Metrics Displayed:**

#### Efficiency Score (Zap Icon)
- **Metric:** `(productive + neutral) / awakeMinutes * 100`
- **What It Means:** How much of your conscious time was well-used
- **Example:** If you were awake 10 hours and spent 7 productively = 70% efficiency
- **Hint:** "of awake time productive"

#### Goal Score (Target Icon)
- **Metric:** `goalAlignedMinutes / awakeMinutes * 100`
- **What It Means:** What fraction of your time supported stated goals
- **Example:** You logged 12 hours; 4 hours aligned with goals = 33% goal score
- **Hint:** "time on goal-aligned work"
- **Implementation:**
  ```typescript
  const goalAlignedSessions = sessions.filter(s => {
    return goals.some(g => 
      s.title.toLowerCase().includes(g.title.toLowerCase())
    );
  });
  ```

#### Wasted Time (AlertTriangle Icon)
- **Metric:** Total distraction minutes from the day
- **What It Means:** Time spent on dopamine-driven activities (social media, gaming, etc.)
- **Example:** 90 minutes on YouTube = "90 min wasted"
- **Hint:** "distraction logged"

#### Untracked Time (Clock Icon)
- **Metric:** `awakeMinutes - (productive + neutral + distraction)`
- **What It Means:** Time you can't account for (hidden time leakage)
- **Example:** 14 hours awake, 12 hours logged = 2 hours untracked
- **Hint:** "hours unaccounted for"
- **Why It Matters:** Untracked time is usually where real waste happens (procrastination, decision paralysis, context switching)

---

### 3. **Today's Timeline** ⏰
**What It Shows:**  
Visual bar chart of your entire waking day broken into 30-minute blocks, color-coded:
- 🟢 **Green** = Productive work
- 🟡 **Yellow** = Neutral activity
- 🔴 **Red** = Distraction

**How It's Implemented:**

```typescript
// DayTimeline component segments the day
const DayTimeline = ({ log, sessions }: Props) => {
  // Build 30-min slots from wake_time to sleep_time
  const slots = generateTimeSlots(log.wake_time, log.sleep_time, 30);
  
  // Map sessions to slots
  const filled = slots.map(slot => {
    const overlappingSession = sessions.find(s =>
      timeOverlap(slot.start, slot.end, s.start_time, s.end_time)
    );
    return {
      slot,
      category: overlappingSession?.category || null
    };
  });
  
  return <Bars>{filled.map(renderColoredBar)}</Bars>;
};
```

**Why It Matters:**  
Humans are **visual creatures**. Seeing the day spatially reveals:
- Time clustering (productive blocks vs fragmented)
- When distraction happens (is it midnight? 3 PM slump?)
- Gaps you didn't know existed
- Patterns that numbers hide

---

### 4. **Goal Contribution Breakdown** 🎯
**What It Shows:**  
For each active goal, how many minutes today contributed to it:

```
Coding                    |████░░░░░| +120 min
Research                  |██░░░░░░░| +40 min
Exercise                  |░░░░░░░░░| +0 min

62% of your day moved goals forward.
```

**How It's Implemented:**

```typescript
// From computeMetrics()
const goalBreakdown = goals
  .map(goal => {
    const goalSessions = sessions.filter(s =>
      goal.keywords.includes(s.title.toLowerCase())
    );
    return {
      goal_id: goal.id,
      title: goal.title,
      minutes: goalSessions.reduce((sum, s) => sum + s.duration_minutes, 0)
    };
  })
  .filter(g => g.minutes > 0)
  .sort((a, b) => b.minutes - a.minutes);
```

**Progress Bar Logic:**  
- Width = `(goalMinutes / awakeMinutes) * 100`
- Capped at 100%
- Only shows goals with >0 minutes

---

### 5. **Current Streak** 🔥
**What It Shows:**  
How many consecutive days you've logged at least one session.

**How It's Implemented:**

```typescript
// From computeStreaks()
const computeStreaks = (logs: DailyLog[]) => {
  const sortedLogs = logs.sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );
  
  let current = 0;
  const today = todayDate();
  
  for (const log of sortedLogs) {
    const expectedDate = new Date(today);
    expectedDate.setDate(expectedDate.getDate() - current);
    
    if (log.date === expectedDate.toISOString().slice(0, 10)) {
      current++;
    } else {
      break;
    }
  }
  
  return { current, longest: computeLongestStreak(logs) };
};
```

**Why Streaks Matter:**  
- **Psychology:** Visible progress is motivating
- **Behavior:** 14+ days is when patterns become visible and stick
- **Design:** The bar fills to 14 to emphasize the pattern-formation threshold

---

### 6. **"If You Fix One Thing"** 💡
**What It Shows:**  
The single highest-leverage intervention for tomorrow, customized to your day.

**How It's Determined:**

```typescript
// Priority logic based on metrics
if (metrics.distraction >= 120) {
  advice = "Cut distraction in half.";
  context = "You lost peak hours today.";
} else if (metrics.goalScore < 25) {
  advice = "Block 60 minutes for your top goal.";
  context = "Goal time is too low.";
} else if (metrics.untracked > awakeMinutes * 0.3) {
  advice = "Log all invisible hours tomorrow.";
  context = "Hidden time leakage.";
} else {
  advice = "Sleep before 12 AM.";
  context = "Consistency matters more than perfection.";
}
```

**Why This Works:**  
Most productivity apps dump 10 recommendations. Users ignore them all.  
LyfOpt identifies the **leverage point** — the one change that breaks the loop.

---

### 7. **Pattern Detected** 📈
**What It Shows:**  
An emerging behavioral pattern discovered by analyzing last 7-14 days.

**Example Patterns:**
- "You perform 38% worse on days after <6h sleep."
- "Morning sessions are 2x more likely to be productive."
- "You task-switch when energy drops below 2/5."

**How It's Computed:**

```typescript
// Simplified pattern detection
const detectPatterns = (history: DbHistoryEntry[]) => {
  const recentDays = history.slice(-14);
  
  // Sleep-performance correlation
  const poorSleepDays = recentDays.filter(d => d.sleep < 360); // < 6 hours
  const avgScorePoorSleep = average(poorSleepDays.map(d => d.score));
  const avgScoreGoodSleep = average(recentDays.map(d => d.score));
  
  if (avgScorePoorSleep < avgScoreGoodSleep * 0.7) {
    return "You perform 38% worse on days after <6h sleep.";
  }
  
  // More patterns...
};
```

**Currently Implemented Patterns:**
1. Sleep correlation
2. Task switching detection
3. Time-of-day effectiveness (morning vs evening)
4. Distraction window clustering

---

### 8. **Sleep vs Focus vs Distraction Trend** 📊
**What It Shows:**  
A multi-line chart tracking three metrics over the last 14 days:
- 🔵 **Blue line** = Sleep hours
- ⚪ **Gray line** = Focus level
- 🔴 **Red dashed line** = Distraction minutes

**How It's Implemented:**

```typescript
const trend = history.slice(-14).map(entry => ({
  date: entry.date.slice(5),      // "05-09" format
  sleep: entry.sleep,              // hours
  focus: entry.focus,              // 1-5 rating
  distraction: entry.distraction  // minutes
}));

// Rendered with Recharts
<LineChart data={trend}>
  <Line type="monotone" dataKey="sleep" stroke={primary} />
  <Line type="monotone" dataKey="focus" stroke={gray} />
  <Line type="monotone" dataKey="distraction" strokeDasharray="4 4" />
</LineChart>
```

**Insights You Can See:**
- Does focus track with sleep? (Most people show correlation)
- When does distraction spike?
- Is there a weekly pattern?

---

### 9. **Daily Log (Time Entry)** 📝
**What It Does:**  
The primary interface for logging time.

**Components:**
1. **Wake & Sleep Times**
   - Time inputs for when you woke and when you sleep
   - Used to calculate "awake minutes" baseline

2. **Energy & Focus Sliders**
   - 1-5 scale for how you felt
   - Used in pattern detection and AI analysis

3. **Mood Selector**
   - low | neutral | good
   - Affects behavioral pattern analysis

4. **Day Rating**
   - 1-10 subjective score for the day
   - Correlation analysis with productivity metrics

5. **Session Entries**
   - Add activity blocks with:
     - **Title** (auto-categorizes via keywords)
     - **Start/End times**
     - **Intentional** (planned vs spontaneous)
     - **Difficulty** (1-5 scale)
   - Sessions auto-categorize as:
     - Productive (coding, study, deep work, etc.)
     - Distraction (YouTube, Instagram, TikTok, gaming)
     - Neutral (meetings, admin, etc.)

**Implementation Detail:**
The categorization happens client-side via heuristic keywords, not manual selection:

```typescript
const categorizeByTitle = (title: string): SessionCategory => {
  const t = title.toLowerCase();
  
  if (t.includes("coding") || t.includes("study")) return "productive";
  if (t.includes("youtube") || t.includes("gaming")) return "distraction";
  return "neutral";
};
```

**Why:** Reduces friction. Users type a title; the system knows what it is.

---

### 10. **Goals Management** 🎯
**What It Does:**  
Define and track goals that the system uses for alignment scoring.

**Goal Properties:**
- **Title:** What you want to achieve
- **Keywords:** Session titles matched against these (e.g., "coding", "study" for a "Learn TypeScript" goal)
- **Priority:** low / medium / high
- **Time Horizon:** daily / weekly / long-term
- **Identity Tag:** "I am someone who..." (behavioral psychology)
- **Type:** short_term (1-30 days) or long_term (30+ days)
- **Measurable or Open-Ended:**
  - Open-ended: "Get better at coding" (subjective)
  - Measurable: "Code 5 hours/week" (objective with target_value + target_unit)

**How Goals Affect the Dashboard:**
- Sessions matching goal keywords boost **Goal Score**
- Days with >25% goal-aligned time get positive reinforcement
- Days with <25% trigger "fix one thing" advice: "Block 60 min for your top goal"

---

### 11. **History/Trends View** 📅
**What It Shows:**  
Paginated list of all days logged, with:
- Date
- Total sessions logged
- Efficiency score
- Goal alignment %
- Mood emoji
- Day rating

**Clickable:** Each day links to detailed breakdown.

**Implementation:**
```typescript
const history = useMemo(
  () => buildHistoryFromDb(logs, sessions, goals).slice().reverse(),
  [logs, sessions, goals]
);

// buildHistoryFromDb aggregates data per day
const buildHistoryFromDb = (logs, sessions, goals) => {
  return logs.map(log => {
    const daySessions = sessions.filter(s => s.log_id === log.id);
    const metrics = computeMetrics(log, daySessions, goals);
    return {
      date: log.date,
      score: computeScore(metrics),
      mood: log.mood,
      sessions: daySessions.length,
      efficiency: metrics.efficiencyScore,
      goalScore: metrics.goalScore
    };
  });
};
```

---

### 12. **Analysis Result (AI-Powered)** 🤖
**What It Does:**  
Uses GPT-4o-mini to generate a **behavioral diagnosis** of your day.

**Returns:**
```typescript
interface AnalyzeDayResult {
  summary: string;           // 1-2 sentence behavioral overview
  core_problem: string;      // The actual root issue
  key_action: string;        // One specific next step
  positives: string[];       // 1-3 real wins from today
  problems: string[];        // 1-3 actual issues observed
  suggestions: string[];     // 1-3 concrete behavioral fixes
  pattern_detected: string;  // Repeating pattern identified
}
```

**Example Output:**
```json
{
  "summary": "You had 62% efficiency today, but goal time was only 18%. The distraction cluster at 11 PM cost you a full focus window.",
  "core_problem": "Late-night distraction is fracturing your momentum when focus is highest.",
  "key_action": "Block 9-10 PM as a hard no-phone window tomorrow.",
  "positives": [
    "Protected 2.5 hours of uninterrupted deep work",
    "Energy stayed at 4/5 despite late evening"
  ],
  "problems": [
    "91 minutes on social media broke focus",
    "Untracked time is hiding 40 minutes"
  ],
  "suggestions": [
    "Set phone to airplane mode 8-9 PM",
    "Log the invisible hours to see what they are",
    "Protect the 2-3 PM window tomorrow (your peak)"
  ],
  "pattern_detected": "Late-night distraction clusters predict worse focus the following day."
}
```

**How It Works (NEW in v2.0):**

The AI receives **enriched context**, not raw data:

#### 1. **Computed Metrics**
```
Productive Time: 180 min
Distraction Time: 91 min
Untracked Time: 49 min
Goal Alignment Score: 62%
Efficiency Score: 72%
Awake Duration: 900 min
```

#### 2. **Behavioral Signals** (Auto-Detected)
```
- Woke up late (after 10 AM)
- High task switching detected (12 sessions)
- Distraction cluster detected late night (10 PM+)
```

#### 3. **Temporal Patterns** (Detected)
```
Peak focus window: Afternoon (12 PM–6 PM)
Distraction cluster: Late night (10 PM–1 AM)
Longest deep work block: 2 h 30 m
```

#### 4. **Goal Alignment Breakdown**
```
62% of sessions supported stated goals.
Aligned: Coding, Research
Unaligned: Gaming, Social Media
```

#### 5. **System Prompt** (New)
The model receives this identity:
```
You are LyfOpt's behavioral operating system.

Your purpose is NOT generic motivation.
Your purpose is behavioral diagnosis.

PRIORITIZE ANALYSIS IN THIS ORDER:
1. Goal alignment
2. Time leakage
3. Deep work quality
4. Behavioral signals
5. Energy management
6. Consistency
```

#### 6. **System + User Message Split**
```
[System Message] Identity + rules + priorities
[User Message] Day data + metrics + signals
```

**API Endpoint:**
```
POST /api/analyze-day

Request body:
{
  "sessions": [...],
  "goals": [...],
  "dailyLog": { ... },
  "userProfile": { tone, weaknesses, strengths },
  "pastSummary": "Yesterday's analysis for continuity",
  "recentPatterns": { recurringProblems, wins, consistencyScore }
}

Response:
{
  "summary": "...",
  "core_problem": "...",
  "key_action": "...",
  "positives": [...],
  "problems": [...],
  "suggestions": [...],
  "pattern_detected": "...",
  "_meta": { source: "openai" }
}
```

**Failure Handling:**
If OpenAI fails (rate limit, timeout, etc.), the system falls back to **rule-based analysis**:

```typescript
// Fallback logic in ruleBasedOutcome()
if (metrics.distraction >= 120) {
  coreProblem = "Distraction is breaking your flow.";
  keyAction = "Remove the main distraction source.";
}
if (metrics.goalScore < 25) {
  coreProblem = "Your day is busy, but goals aren't aligned.";
  keyAction = "Block 60 minutes for your top goal.";
}
// ... etc
```

The fallback produces **reasonable** advice and keeps the system resilient.

---

## Data Flow Architecture

### On Dashboard Load:
```
1. useAuth() → Get user context
   ↓
2. Parallel fetch:
   - fetchDailyLogsFromDb()
   - fetchSessionsFromDb()
   - fetchGoalsFromDb()
   ↓
3. Compute:
   - buildHistoryFromDb() → 90-day history
   - computeMetrics() → Today's metrics
   - computeStreaks() → Streak count
   ↓
4. Render components with computed data
```

### On Analysis Request:
```
1. User clicks "Analyze Today"
   ↓
2. buildPayload(dailyLog, sessions, goals, userProfile, recentPatterns)
   ↓
3. POST /api/analyze-day {payload}
   ↓
4. API:
   - Add computed metrics to context (NEW)
   - Detect behavioral signals (NEW)
   - Calculate goal alignment (NEW)
   - Detect temporal patterns (NEW)
   - Call OpenAI with system + user messages (NEW)
   ↓
5. Parse JSON response → AnalyzeDayResult
   ↓
6. Render on AnalysisResult page
```

---

## Technical Stack

### Frontend
- **Next.js 15** (App Router)
- **React 19** with hooks
- **TypeScript**
- **Framer Motion** (animations)
- **Recharts** (charts)
- **Shadcn UI** (components)
- **Tailwind CSS** (styling)

### Backend
- **Next.js API Routes** (Node runtime)
- **Supabase** (PostgreSQL)
- **OpenAI GPT-4o-mini** (AI analysis)

### Local Persistence
- **localStorage** (fallback for offline, development)

### Auth
- **Supabase Auth** with Magic Link / OAuth

---

## Database Schema (Supabase PostgreSQL)

```sql
-- Daily logs (user subjective state)
CREATE TABLE daily_logs (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users,
  date DATE NOT NULL,
  wake_time TIME,
  sleep_time TIME,
  energy_level INT (1-5),
  focus_level INT (1-5),
  mood TEXT ('low'|'neutral'|'good'),
  day_rating INT (1-10),
  created_at TIMESTAMP
);

-- Activity sessions (time blocks)
CREATE TABLE activity_sessions (
  id UUID PRIMARY KEY,
  log_id UUID REFERENCES daily_logs,
  user_id UUID REFERENCES auth.users,
  title TEXT,
  category TEXT ('productive'|'neutral'|'distraction'),
  intentional BOOLEAN,
  difficulty INT (1-5),
  start_time TIMESTAMP,
  end_time TIMESTAMP,
  duration_minutes INT,
  created_at TIMESTAMP
);

-- Goals
CREATE TABLE goals (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users,
  title TEXT,
  category TEXT,
  type TEXT ('short_term'|'long_term'),
  priority TEXT ('low'|'medium'|'high'),
  time_horizon TEXT ('daily'|'weekly'|'long-term'),
  identity_tag TEXT,
  is_active BOOLEAN,
  keywords JSONB ARRAY,
  open_ended BOOLEAN,
  target_value INT,
  target_unit TEXT,
  created_at TIMESTAMP
);

-- User preferences
CREATE TABLE user_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users,
  feedback_style TEXT ('strict'|'balanced'|'motivational'),
  timezone TEXT,
  updated_at TIMESTAMP
);

-- Monthly reviews (optional)
CREATE TABLE monthly_reviews (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users,
  month DATE,
  summary TEXT,
  created_at TIMESTAMP
);
```

---

## Computation Logic

### Efficiency Score
```
Efficiency = (productive_minutes + neutral_minutes) / awake_minutes * 100
```
**Rationale:** Productive + neutral time that's productive time. Distraction isn't "wasted" per se, but it's not used effectively.

### Goal Score
```
Goal Score = goal_aligned_minutes / awake_minutes * 100
```
**Rationale:** What fraction of the day supported stated goals.

### Awake Minutes
```
Awake Minutes = time_from(wake_time) to time_to(sleep_time)
```
**Rationale:** Not calendar time, but actual conscious time.

### Untracked Minutes
```
Untracked = Awake Minutes - (Productive + Neutral + Distraction)
```
**Rationale:** Time not accounted for in logged sessions.

### Day Score (for history)
```
Day Score = (Efficiency Score * 0.65) + (Goal Score * 0.35)
```
**Rationale:**
- Efficiency is the base (how well you used time)
- Goal alignment matters too (did it move you forward?)
- Weighted 65/35 because consistency matters more than perfection

---

## Behavioral Intelligence Features (v2.0)

### Session Classification
Sessions are automatically classified into behavioral categories:

```typescript
classifySession(title: string): "dopamine" | "physical" | "deep_work" | "entertainment" | "general"
```

**Keywords Detected:**
- **Dopamine:** YouTube, Instagram, TikTok, Reddit
- **Physical:** Gym, football, exercise, run, walk
- **Deep Work:** Study, deep work, coding, writing, research
- **Entertainment:** Gaming, games, play
- **General:** Everything else

**Why It Matters:**
The system now knows *why* time was spent, not just how much.

### Behavioral Signal Detection
Auto-detects patterns:
- Late wakeup (after 10 AM)
- Late sleep (after 1 AM)
- Fragmented work (>3 deep work blocks)
- Excessive entertainment (>3 dopamine/entertainment sessions)
- No deep work detected
- Task switching (>8 sessions in a day)
- Distraction clusters (late-night dopamine sessions)

```typescript
detectBehavioralSignals(payload): {
  lateWakeup: boolean,
  lateSleep: boolean,
  fragmentedWork: boolean,
  excessiveEntertainment: boolean,
  noDeepWork: boolean,
  taskSwitching: boolean,
  highDistractionClusters: boolean,
  signals: string[]  // human-readable
}
```

### Temporal Pattern Detection
Identifies when you're most productive and when distraction clusters:

```typescript
detectTemporalPatterns(payload): {
  peakFocusWindow: string;       // "Early morning (6 AM–12 PM)"
  distractionCluster: string;    // "Late night (10 PM–6 AM)"
  longestDeepWorkBlock: string;  // "2h 30m"
  earlyMorningActivity: boolean;
  lateNightActivity: boolean;
}
```

### Goal Alignment Analysis
Reveals identity conflict (stated goals vs actual behavior):

```typescript
calculateGoalAlignment(payload): {
  alignmentPercentage: number;
  alignedActivities: string[];
  unalignedActivities: string[];
}
```

**Example Output:**
```
62% of sessions supported stated goals.
Aligned: Coding, Research
Unaligned: Gaming, Social Media
```

This surfaces the real friction: "I want to code, but I'm gaming instead."

---

## Performance Considerations

### Dashboard Load Time
- Data fetch: ~200ms (Supabase query)
- Computation: ~50ms (metrics, history, streaks)
- Render: ~300ms (React + Framer Motion)
- **Total:** ~550ms (acceptable for business app)

### AI Analysis Request
- Preprocessing (metrics, signals, patterns): ~5-10ms
- OpenAI API call: ~1-3s (including network latency)
- Response parsing: ~20ms
- **Total:** ~2s (expected for LLM call)

### Storage
- One user, 365 days of logs: ~15-20 KB
- Seasonal patterns up to 90 days in memory: ~50 KB
- All in-browser or PostgreSQL (no issues)

---

## Testing & Debugging

### Debug Mode
Enable via query param: `/app/analysis?debug=1`

Shows:
- Full API payload sent to GPT
- Raw API response before parsing
- Computed metrics breakdown
- Behavioral signals detected
- Temporal patterns found

### Development
- Set `NODE_ENV=development` for verbose logging
- All AI calls log to console with `[AI]` prefix
- Fallback triggers log: `[AI ERROR]`

### Common Issues

**"No sessions logged"**
- Dashboard shows placeholder text
- Encourages user to start with Daily Log

**"Analysis seems generic"**
- Check if user has:
  - ≥3 days of data (patterns need history)
  - ≥5 goals defined (alignment needs targets)
  - Varied session types (dopamine/deep work/physical)
- Fallback rule-based analysis is less contextual

**"API timeout"**
- System retries once, then falls back to rule-based
- User gets reasonable advice either way

---

## Future Enhancements

### Planned (v3.0)
1. **Weekly Review** - AI-generated week summary
2. **Habit Stacking** - Suggest habits to build on existing patterns
3. **Social Accountability** - Share streaks with accountability partner
4. **Mobile App** - React Native version
5. **Slack Integration** - Daily summary in Slack
6. **A/B Testing** - Measure which interventions work best

### Under Research
1. **Energy Model** - Predict when you'll be most productive
2. **Distraction Triggers** - Why you reach for social media at specific times
3. **Goal Difficulty Ranking** - Which goals require most willpower
4. **Personalized Recommendations** - ML-driven next actions

---

## Summary

LyfOpt's dashboard transforms **raw time data** into **behavioral intelligence**:

1. **Collect** what happened (sessions, moods, goals)
2. **Compute** what it means (metrics, patterns, signals)
3. **Reason** with AI what to do about it (GPT-4o-mini analysis)
4. **Show** the highest-leverage insight
5. **Repeat** tomorrow

The result: A system that feels like a **behavioral operating system**, not a productivity app. It diagnoses problems, doesn't just measure them.

---

**For questions or implementation details, see:**
- `/lib/sessions.ts` - Data model & computation
- `/lib/ai.ts` - AI context & prompt building
- `/app/api/analyze-day/route.ts` - AI analysis endpoint
- `/views/Dashboard.tsx` - Dashboard rendering
- `/views/app/*.tsx` - Individual feature pages
