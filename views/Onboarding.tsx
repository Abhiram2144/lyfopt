"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ArrowRight, ArrowLeft, Sparkles, Check } from "lucide-react";
import { useAuth } from "@/components/site/AuthProvider";
import {
  baselineLabel,
  emptyProfile,
  failureLabel,
  feedbackLabel,
  saveProfileToDatabase,
  type BaselineType,
  type FailurePattern,
  type FeedbackStyle,
  type OnboardingProfile,
} from "@/lib/onboarding";

const TOTAL_STEPS = 5; // 4 questions + summary

const baselineOptions: { value: BaselineType; title: string; sub: string }[] = [
  { value: "capable_inconsistent", title: "I'm capable, but inconsistent", sub: "Good days, then nothing." },
  { value: "all_over_the_place", title: "I feel all over the place most days", sub: "Hard to find footing." },
  { value: "enough_but_more", title: "I do enough, but I know I can do more", sub: "Underperforming on purpose." },
  { value: "disciplined_optimize", title: "I'm disciplined, but want to optimize", sub: "Looking for the next edge." },
];

const failureOptions: { value: FailurePattern; title: string }[] = [
  { value: "distracted", title: "I get distracted easily" },
  { value: "waste_time", title: "I waste time without realizing" },
  { value: "low_energy", title: "I lack energy / feel tired" },
  { value: "not_consistent", title: "I start strong but don't stay consistent" },
  { value: "no_clarity", title: "I'm not clear on what matters" },
];

const feedbackOptions: { value: FeedbackStyle; title: string; sub: string }[] = [
  { value: "strict", title: "Strict", sub: "Call me out." },
  { value: "balanced", title: "Balanced", sub: "Honest but fair." },
  { value: "supportive", title: "Supportive", sub: "Encouraging." },
];

const moodOptions: { value: 1 | 2 | 3 | 4 | 5; title: string; emoji: string }[] = [
  { value: 1, title: "Very low", emoji: "😞" },
  { value: 2, title: "Low", emoji: "😕" },
  { value: 3, title: "Okay", emoji: "😐" },
  { value: 4, title: "Good", emoji: "🙂" },
  { value: 5, title: "Great", emoji: "😄" },
];

const SelectCard = ({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      "group relative w-full text-left rounded-xl border p-5 transition-all duration-200",
      "bg-card hover:scale-[1.01] hover:border-primary/60",
      selected
        ? "border-primary bg-primary/10 shadow-glow"
        : "border-border"
    )}
  >
    <div className="flex items-start justify-between gap-3">
      <div className="flex-1">{children}</div>
      <span
        className={cn(
          "mt-0.5 grid h-5 w-5 place-items-center rounded-full border transition-colors",
          selected ? "border-primary bg-primary text-primary-foreground" : "border-border"
        )}
      >
        {selected && <Check className="h-3 w-3" strokeWidth={3} />}
      </span>
    </div>
  </button>
);

const StepWrapper = ({ children, k }: { children: React.ReactNode; k: number }) => (
  <motion.div
    key={k}
    initial={{ opacity: 0, x: 24 }}
    animate={{ opacity: 1, x: 0 }}
    exit={{ opacity: 0, x: -24 }}
    transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
    className="w-full"
  >
    {children}
  </motion.div>
);

const Onboarding = () => {
  const router = useRouter();
  const { loading: authLoading, session } = useAuth();
  const [step, setStep] = useState(1);
  const [profile, setProfile] = useState<OnboardingProfile>(emptyProfile());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const canNext = (() => {
    if (step === 1) return !!profile.baseline_type;
    if (step === 2) return profile.failure_patterns.length > 0;
    if (step === 3) return !!profile.feedback_style;
    if (step === 4) return !!profile.mood_level;
    return true;
  })();

  const next = () => {
    if (step < TOTAL_STEPS) setStep((s) => s + 1);
  };

  const back = () => {
    if (step > 1) setStep((s) => s - 1);
  };

  const finish = async () => {
    setError("");

    if (authLoading) return;

    if (!session?.user) {
      router.replace("/login");
      return;
    }

    setSaving(true);
    try {
      await saveProfileToDatabase(session.user.id, profile);
      router.replace("/app");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save onboarding profile.");
    } finally {
      setSaving(false);
    }
  };

  const toggleFailure = (v: FailurePattern) => {
    setProfile((p) => {
      const has = p.failure_patterns.includes(v);
      if (has) return { ...p, failure_patterns: p.failure_patterns.filter((x) => x !== v) };
      if (p.failure_patterns.length >= 2) return p; // max 2
      return { ...p, failure_patterns: [...p.failure_patterns, v] };
    });
  };

  const progress = (step / TOTAL_STEPS) * 100;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top bar */}
      <header className="border-b border-border">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2 font-display font-semibold">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary shadow-glow">
              <Sparkles className="h-4 w-4 text-primary-foreground" />
            </span>
            LyfOpt
          </div>
          <div className="text-xs text-muted-foreground font-mono">
            {step} / {TOTAL_STEPS}
          </div>
        </div>
        <div className="h-1 bg-card overflow-hidden">
          <motion.div
            className="h-full bg-primary"
            initial={false}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          />
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-2xl">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <StepWrapper k={1}>
                <h1 className="font-display text-3xl md:text-4xl font-bold text-gradient text-center">
                  Which one feels closest to your current life?
                </h1>
                <p className="mt-3 text-center text-sm text-muted-foreground">
                  Be honest. This sets the tone of every analysis.
                </p>
                <div className="mt-10 grid gap-3">
                  {baselineOptions.map((o) => (
                    <SelectCard
                      key={o.value}
                      selected={profile.baseline_type === o.value}
                      onClick={() => setProfile((p) => ({ ...p, baseline_type: o.value }))}
                    >
                      <div className="font-medium">{o.title}</div>
                      <div className="text-sm text-muted-foreground mt-0.5">{o.sub}</div>
                    </SelectCard>
                  ))}
                </div>
              </StepWrapper>
            )}

            {step === 2 && (
              <StepWrapper k={2}>
                <h1 className="font-display text-3xl md:text-4xl font-bold text-gradient text-center">
                  When things go wrong, what usually causes it?
                </h1>
                <p className="mt-3 text-center text-sm text-muted-foreground">
                  Pick up to 2. {profile.failure_patterns.length}/2 selected.
                </p>
                <div className="mt-10 grid gap-3">
                  {failureOptions.map((o) => {
                    const selected = profile.failure_patterns.includes(o.value);
                    const disabled = !selected && profile.failure_patterns.length >= 2;
                    return (
                      <div key={o.value} className={disabled ? "opacity-40 pointer-events-none" : ""}>
                        <SelectCard selected={selected} onClick={() => toggleFailure(o.value)}>
                          <div className="font-medium">{o.title}</div>
                        </SelectCard>
                      </div>
                    );
                  })}
                </div>
              </StepWrapper>
            )}

            {step === 3 && (
              <StepWrapper k={3}>
                <h1 className="font-display text-3xl md:text-4xl font-bold text-gradient text-center">
                  How should LyfOpt talk to you?
                </h1>
                <p className="mt-3 text-center text-sm text-muted-foreground">
                  This controls the tone of your daily feedback.
                </p>
                <div className="mt-10 grid gap-3">
                  {feedbackOptions.map((o) => (
                    <SelectCard
                      key={o.value}
                      selected={profile.feedback_style === o.value}
                      onClick={() => setProfile((p) => ({ ...p, feedback_style: o.value }))}
                    >
                      <div className="font-medium">{o.title}</div>
                      <div className="text-sm text-muted-foreground mt-0.5">{o.sub}</div>
                    </SelectCard>
                  ))}
                </div>
              </StepWrapper>
            )}

            {step === 4 && (
              <StepWrapper k={4}>
                <h1 className="font-display text-3xl md:text-4xl font-bold text-gradient text-center">
                  How are you feeling today?
                </h1>
                <p className="mt-3 text-center text-sm text-muted-foreground">
                  Sets a baseline so we can track how you trend.
                </p>
                <div className="mt-10 grid grid-cols-5 gap-2 md:gap-3">
                  {moodOptions.map((o) => {
                    const selected = profile.mood_level === o.value;
                    return (
                      <button
                        key={o.value}
                        type="button"
                        onClick={() => setProfile((p) => ({ ...p, mood_level: o.value }))}
                        className={cn(
                          "rounded-xl border p-4 transition-all duration-200 hover:scale-[1.04] flex flex-col items-center gap-2",
                          selected
                            ? "border-primary bg-primary/10 shadow-glow"
                            : "border-border bg-card"
                        )}
                      >
                        <span className="text-2xl md:text-3xl">{o.emoji}</span>
                        <span className="text-[11px] md:text-xs font-medium">{o.title}</span>
                      </button>
                    );
                  })}
                </div>
              </StepWrapper>
            )}

            {step === 5 && (
              <StepWrapper k={5}>
                <div className="text-center">
                  <span className="text-xs uppercase tracking-widest text-primary">Profile ready</span>
                  <h1 className="mt-3 font-display text-3xl md:text-4xl font-bold text-gradient">
                    This is how LyfOpt understands you.
                  </h1>
                </div>
                <div className="mt-10 rounded-2xl border border-primary/30 bg-card p-6 md:p-8 shadow-glow">
                  <p className="text-base md:text-lg leading-relaxed">
                    You're currently{" "}
                    <span className="text-primary font-medium">
                      {profile.baseline_type ? baselineLabel[profile.baseline_type] : "—"}
                    </span>
                    , often{" "}
                    <span className="text-primary font-medium">
                      {profile.failure_patterns.length > 0
                        ? profile.failure_patterns.map((f) => failureLabel[f]).join(" and ")
                        : "—"}
                    </span>
                    , and respond best to{" "}
                    <span className="text-primary font-medium">
                      {profile.feedback_style ? feedbackLabel[profile.feedback_style] : "—"}
                    </span>
                    . Today you're feeling{" "}
                    <span className="text-primary font-medium">
                      {profile.mood_level
                        ? moodOptions.find((m) => m.value === profile.mood_level)?.title.toLowerCase()
                        : "—"}
                    </span>
                    .
                  </p>
                  <div className="mt-6 pt-6 border-t border-border text-sm text-muted-foreground">
                    LyfOpt will tune every analysis to this profile. You can change it anytime.
                  </div>
                </div>
              </StepWrapper>
            )}
          </AnimatePresence>

          {/* Nav */}
          <div className="mt-10 flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={back}
              disabled={step === 1}
              className={step === 1 ? "invisible" : ""}
            >
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>

            {step < TOTAL_STEPS ? (
              <Button variant="hero" onClick={next} disabled={!canNext}>
                Continue <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <div className="flex flex-col items-end gap-2">
                {error && <p className="max-w-xs text-right text-sm text-destructive">{error}</p>}
                <Button variant="hero" onClick={finish} disabled={saving || authLoading}>
                  {saving ? "Saving..." : "Enter LyfOpt"} <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Onboarding;
