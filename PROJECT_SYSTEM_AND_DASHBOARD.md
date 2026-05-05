# LyfOpt Project System and Dashboard Documentation

## Overview
LyfOpt is a Next.js application focused on time tracking, behavior analysis, and personal productivity coaching. The product is built around one main idea: users log their day, LyfOpt turns that raw activity data into clear feedback, and the dashboard shows the most important patterns without forcing the user to interpret charts manually.

The app combines a marketing site, an authentication flow, onboarding, and a dashboard area under `/app`. The dashboard is the core product surface where users log sessions, review analysis, inspect trends, and tune how the system responds to them.

## System Architecture
LyfOpt uses a modern client-heavy Next.js structure with Supabase for authentication and data storage.

### Main technologies
- Next.js App Router for routing and page structure.
- React client components for interactive screens.
- Supabase Auth for sign-in, sign-up, and session handling.
- Supabase Postgres tables for logs, sessions, goals, reviews, and preferences.
- Row Level Security policies that scope every record to the current authenticated user.
- Framer Motion for page and content animation.
- Recharts for the dashboard trend graph.
- Lucide icons and custom UI components for the visual system.

### Data model
The app revolves around a few core records:
- `profiles`: user account records.
- `profile_onboarding`: onboarding answers and personal style preferences.
- `daily_logs`: one row per day with wake and sleep time.
- `activity_sessions`: individual activity blocks inside a day.
- `goals`: user goals used to score goal-aligned time.
- `monthly_reviews`: monthly reflection answers.
- `user_preferences`: app behavior preferences such as whether gaming counts as distraction.

### Data flow
1. The user signs in or creates an account.
2. Onboarding collects the user’s baseline, failure patterns, tone preference, and mood.
3. The dashboard reads daily logs, sessions, and goals from Supabase.
4. Metrics are computed locally from the fetched data.
5. The dashboard and supporting pages present those metrics as feedback, trends, summaries, and next actions.
6. RLS keeps every query limited to the current user.

## Global System Behavior
### Authentication
- Users can sign up with email/password or Google.
- Existing authenticated users are redirected into onboarding or the app depending on whether onboarding is complete.
- The auth provider exposes the current session, loading state, and sign-in/sign-out actions.

### Error handling
- App screens now wait for auth readiness before loading protected data.
- Supabase errors are surfaced as readable messages rather than crashing the page with opaque rejections.
- The app uses a shared error-message helper to convert unknown thrown values into useful text.

### Access control
- The database should use `auth.uid()` in policies.
- Every table is scoped so users can only select, insert, update, or delete their own rows.
- The app depends on those policies for safe reads and writes.

## Page Inventory

## Public Site Pages
### Home page
Purpose: Introduce LyfOpt and explain the value proposition.

What it shows:
- Hero message about AI-driven life analysis.
- A mock dashboard preview.
- A problem section explaining why people lose clarity.
- A comparison section showing life with and without LyfOpt.
- Feature explanations and a final call to action.

### About page
Purpose: Explain the motivation behind the product and the philosophy of the system.

What it shows:
- Why the product exists.
- Why AI is used.
- What LyfOpt intentionally avoids, such as fake gamification.
- Design principles like clarity, honesty, and actionability.

### Pricing page
Purpose: Present the available plans.

Plans:
- Free: core analysis and limited usage.
- Pro: unlimited analysis, insights, weekly summaries, and full history.
- Premium: deeper analysis, goal-based feedback, and long-horizon trends.

### Login and Signup pages
Purpose: Authenticate users and route them into onboarding or the dashboard.

Features:
- Email/password login.
- Email/password sign-up.
- Google sign-in.
- Automatic redirect after login if onboarding is already done.
- Branding and consistent visual shell.

### Auth callback page
Purpose: Finish OAuth sign-in and move the user to the next screen.

### Onboarding page
Purpose: Collect the personalization data that powers the tone and framing of analysis.

What it asks:
- Baseline life situation.
- Common failure patterns.
- Feedback style preference.
- Current mood.

What it does:
- Saves the onboarding profile to Supabase.
- Stores the completed profile locally for quick access.
- Routes the user into the app after completion.

## Dashboard App Pages
These pages live under `/app` and form the product experience after sign-in.

### Dashboard page
Purpose: Give the user a high-signal summary of the current day.

Dashboard features:
- Personalized greeting using the user’s name.
- Short status summary of the day.
- Hero analysis card that states what happened today in plain language.
- Core problem panel that identifies the biggest issue.
- One key action panel that tells the user what to do next.
- Quick action buttons to log a session or manage goals.
- Score cards for efficiency, goal score, wasted time, and untracked time.
- Today’s timeline showing how the day was spent across session blocks.
- Goal contribution card showing where goal-aligned time went.
- Current streak card showing consecutive logged days.
- “If you fix one thing” card that prioritizes the highest leverage behavior.
- Pattern detection card that points out a repeatable issue.
- Trend chart comparing sleep, focus, and distraction over the last 14 days.
- Footer summary line that shows the feedback style, number of days analyzed, and the most recent score.
- Error banner if the user’s dashboard data cannot be loaded.

### Daily Log page
Purpose: Let users record their day in detail.

Features:
- Wake and sleep time inputs.
- Session composer with title, start time, and end time.
- Automatic session categorization into productive, neutral, or distraction.
- Goal matching based on keywords.
- Timeline preview of all sessions for the day.
- Session list with delete controls.
- Live metrics summary for productive time, distraction, wasted time, and goal score.
- Run analysis button that sends the user to the analysis result view.

### Analysis page
Purpose: Convert the logged day into a structured report.

Features:
- Analyzing/loading state.
- Score pills for efficiency, goal score, and wasted time.
- Summary block with the main insight.
- Core problem block with the biggest issue.
- Key action block with the next step.
- Problems, positives, and suggestions lists.
- Action buttons to go back to the dashboard or log another day.

### History page
Purpose: Show the list of all logged days in reverse chronological order.

Features:
- Compact list of historical days.
- Score display per day.
- Summary snippet for each day.
- Visual status dot indicating strong, average, or weak days.
- Click-through navigation into the analysis screen for a selected day.

### Insights page
Purpose: Surface longer-term patterns over the last 30 days.

Features:
- Bar chart of daily scores.
- Four generated insight cards.
- Sleep-based performance comparison.
- Best-day and worst-day pattern identification.
- Month-half comparison to show whether the user is improving or slipping.
- A recommendation card that gives a clear next move.

### Reports page
Purpose: Provide a weekly review of the user’s recent performance.

Features:
- Weekly score average.
- Average sleep.
- Average focus time.
- Average distraction time.
- Key problems section.
- Improvements section.
- AI recommendation block based on the weekly averages.

### Goals page
Purpose: Let users define what matters so the analysis can score goal-aligned time.

Features:
- Create new goals.
- Set goal title, category, type, keywords, and whether it is open-ended.
- Optional measurable target value and unit.
- Delete existing goals.
- Goal list rendered as cards.
- Goal data is used by the dashboard and analysis pages for goal scoring.

### Monthly Review page
Purpose: Capture a monthly reflection and convert it into a structured summary.

Features:
- Step-by-step reflection flow.
- Questions about life feeling, energy, time usage, progress, problems, regrets, and future priorities.
- Goal selection during the reflection.
- A calculated alignment score.
- A final summary screen with a generated month-level insight.
- Save action that stores the review in Supabase.

### Settings page
Purpose: Let the user control personalization and stored preferences.

Features:
- Plan display.
- Gaming distraction preference toggle.
- Feedback style selector.
- Onboarding data preview.
- Re-run onboarding action.
- Save changes and sign out actions.
- Error handling for load and save failures.

## Dashboard Feature Summary
The dashboard is the most important screen in the app. It translates raw logging data into decisions the user can act on immediately.

### What the dashboard tells the user
- How much of the day was used effectively.
- How much time went to distraction.
- How much time was not tracked.
- Whether the day pushed goals forward.
- What the biggest leak was.
- What one action would improve tomorrow the most.
- Whether a streak is forming.
- Which pattern appears across multiple days.
- How sleep, focus, and distraction move together over time.

### Why these features matter
- The greeting and summary create a personal, human entry point.
- The hero analysis turns data into a plain-English assessment.
- The score cards make the most important metrics scannable.
- The timeline visualizes the actual shape of the day.
- Goal contribution connects behavior to goals, not just time spent.
- The streak card reinforces consistency.
- The fix-one-thing card prevents overload and keeps the advice actionable.
- The pattern card highlights leverage, not noise.
- The chart gives context over time without overwhelming the user.

## Supporting Components and Utilities
### App layout components
- `AppLayout` provides the authenticated app shell.
- `AppSidebar` and related dashboard navigation components structure the `/app` area.
- `Navbar`, `Footer`, and `Layout` support the public site.

### UI system
- Shared UI primitives live in `components/ui`.
- Custom buttons, cards, sheets, dialogs, and tables keep the design consistent.
- Motion and reveal components add a polished presentation layer.

### Session helpers
- `lib/sessions.ts` contains the database fetch and write helpers.
- It also computes metrics, streaks, history summaries, and the day score.
- These helpers are what make the dashboard and reports intelligent.

### Onboarding helpers
- `lib/onboarding.ts` stores and loads the user’s profile.
- It determines the feedback tone used throughout the app.

### Error helper
- `lib/error.ts` converts unknown errors into messages safe to display.

## Important Notes
- The repo currently contains the schema file in `sql/fresh-schema.sql` and a migration in `sql/migrations/20260501_reset_rls_to_auth_uid.sql` that resets policies to `auth.uid()`.
- If the live Supabase database still uses an old claim-based policy, the app will keep throwing the `request.jwt.claim.profile_id` error until that migration is applied.

## Suggested User Flow
1. Visit the homepage.
2. Sign up or log in.
3. Complete onboarding.
4. Add goals in the Goals page.
5. Log the day in Daily Log.
6. Run analysis.
7. Review the result, history, insights, and weekly report.
8. Update settings or monthly review as needed.

## Short Summary
LyfOpt is a personalized time-analysis app built around a dashboard that turns logging data into direct feedback. The system combines authentication, onboarding, session tracking, goal alignment, trend analysis, and monthly reflection into one loop focused on clarity and behavior change.
