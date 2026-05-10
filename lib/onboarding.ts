import { supabase } from "@/lib/supabase";

export type BaselineType =
  | "capable_inconsistent"
  | "all_over_the_place"
  | "enough_but_more"
  | "disciplined_optimize";

export type FailurePattern =
  | "distracted"
  | "waste_time"
  | "low_energy"
  | "not_consistent"
  | "no_clarity";

export type FeedbackStyle = "strict" | "balanced" | "supportive";

export interface OnboardingProfile {
  baseline_type: BaselineType | null;
  failure_patterns: FailurePattern[];
  feedback_style: FeedbackStyle | null;
  mood_level: 1 | 2 | 3 | 4 | 5 | null;
  completed_at?: string;
}

const KEY = "lyfopt:profile";

type OnboardingRow = {
  profile_id: string;
  baseline_type: BaselineType | null;
  failure_patterns: FailurePattern[] | null;
  feedback_style: FeedbackStyle | null;
  initial_mood: 1 | 2 | 3 | 4 | 5 | null;
  onboarding_completed_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export const emptyProfile = (): OnboardingProfile => ({
  baseline_type: null,
  failure_patterns: [],
  feedback_style: null,
  mood_level: null,
});

export const saveProfile = (p: OnboardingProfile) => {
  localStorage.setItem(KEY, JSON.stringify({ ...p, completed_at: new Date().toISOString() }));
};

export const loadProfile = (): OnboardingProfile | null => {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as OnboardingProfile) : null;
  } catch {
    return null;
  }
};

export const loadProfileFromDatabase = async (userId: string): Promise<OnboardingProfile | null> => {
  const { data, error } = await supabase
    .from("profile_onboarding")
    .select("profile_id, baseline_type, failure_patterns, feedback_style, initial_mood, onboarding_completed_at, created_at, updated_at")
    .eq("profile_id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data || !data.baseline_type || !data.feedback_style || !data.initial_mood) {
    return null;
  }

  const row = data as OnboardingRow;
  const profile: OnboardingProfile = {
    baseline_type: row.baseline_type,
    failure_patterns: row.failure_patterns ?? [],
    feedback_style: row.feedback_style,
    mood_level: row.initial_mood,
    completed_at: row.onboarding_completed_at ?? row.created_at ?? new Date().toISOString(),
  };
  saveProfile(profile);
  return profile;
};

export const hasCompletedOnboarding = async (userId: string): Promise<boolean> => {
  const profile = await loadProfileFromDatabase(userId);
  return Boolean(profile?.completed_at);
};

export const saveProfileToDatabase = async (userId: string, profile: OnboardingProfile) => {
  const { error: profileError } = await supabase
    .from("profiles")
    .upsert({ id: userId }, { onConflict: "id" });

  if (profileError) {
    throw new Error(profileError.message);
  }

  const onboardingRow = {
    profile_id: userId,
    baseline_type: profile.baseline_type,
    failure_patterns: profile.failure_patterns,
    feedback_style: profile.feedback_style,
    initial_mood: profile.mood_level,
    onboarding_completed_at: new Date().toISOString(),
  };

  const { error } = await supabase.from("profile_onboarding").upsert(onboardingRow, { onConflict: "profile_id" });

  if (error) {
    throw new Error(error.message);
  }

  saveProfile(profile);
};

export const baselineLabel: Record<BaselineType, string> = {
  capable_inconsistent: "capable but inconsistent",
  all_over_the_place: "all over the place",
  enough_but_more: "doing enough, but capable of more",
  disciplined_optimize: "disciplined and optimizing",
};

export const failureLabel: Record<FailurePattern, string> = {
  distracted: "easily distracted",
  waste_time: "losing time without realizing",
  low_energy: "low on energy",
  not_consistent: "starting strong but not staying consistent",
  no_clarity: "unclear on what matters",
};

export const feedbackLabel: Record<FeedbackStyle, string> = {
  strict: "direct, no-fluff feedback",
  balanced: "honest but fair feedback",
  supportive: "encouraging feedback",
};
