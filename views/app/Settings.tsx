"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/site/AuthProvider";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  loadProfileFromDatabase,
  saveProfileToDatabase,
  type FeedbackStyle,
  type OnboardingProfile,
} from "@/lib/onboarding";
import {
  fetchUserPreferencesFromDb,
  saveUserPreferencesToDb,
  type UserPreferencesRow,
} from "@/lib/sessions";
import { Check, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const plans = [
  { id: "free", name: "Free", desc: "Daily logs + basic alignment." },
  { id: "pro", name: "Pro", desc: "Unlimited insights + weekly progress summaries." },
  { id: "premium", name: "Premium", desc: "Personalized AI coach + priority models." },
];

const styles: { id: FeedbackStyle; label: string; desc: string }[] = [
  { id: "strict", label: "Strict", desc: "Direct, no fluff. Calls out what you're avoiding." },
  { id: "balanced", label: "Balanced", desc: "Honest but fair. Default mode." },
  { id: "supportive", label: "Supportive", desc: "Encouraging tone. Same insights, softer." },
];

const Settings = () => {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [plan, setPlan] = useState("pro");
  const [profile, setProfile] = useState<OnboardingProfile | null>(null);
  const [style, setStyle] = useState<FeedbackStyle>("balanced");
  const [gamingIsDistraction, setGamingIsDistraction] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      if (loading || !user) return;

      try {
        const [loadedProfile, loadedPrefs] = await Promise.all([
          loadProfileFromDatabase(user.id),
          fetchUserPreferencesFromDb(),
        ]);
        if (!active) return;
        setProfile(loadedProfile);
        setStyle(loadedProfile?.feedback_style ?? "balanced");
        setGamingIsDistraction(loadedPrefs?.gaming_is_distraction ?? true);
      } catch (error) {
        if (!active) return;
        const message =
          error instanceof Error
            ? error.message
            : typeof error === "string"
              ? error
              : "Unable to load settings right now.";
        setLoadError(message);
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, [loading, user]);

  const save = async () => {
    try {
      if (user && profile) {
        await saveProfileToDatabase(user.id, { ...profile, feedback_style: style });
      }
      await saveUserPreferencesToDb({ gaming_is_distraction: gamingIsDistraction });
      toast.success("Settings saved");
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : typeof error === "string"
            ? error
            : "Unable to save settings right now.";
      toast.error(message);
    }
  };

  const logout = () => {
    localStorage.removeItem("lyfopt:profile");
    router.replace("/");
  };

  return (
    <>
      <div className="px-4 md:px-8 py-6 md:py-10 max-w-3xl mx-auto space-y-8">
        {loadError && (
          <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-foreground">
            {loadError}
          </div>
        )}

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="font-display text-2xl md:text-3xl font-semibold">Settings</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            How LyfOpt analyzes you and talks to you.
          </p>
        </motion.div>

        <Section title="Plan">
          <div className="grid md:grid-cols-3 gap-3">
            {plans.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPlan(p.id)}
                className={cn(
                  "text-left rounded-xl border p-4 transition-all",
                  plan === p.id
                    ? "border-primary bg-primary/5"
                    : "border-border bg-card hover:border-primary/30",
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="font-display text-base font-medium">{p.name}</div>
                  {plan === p.id && <Check className="h-4 w-4 text-primary" />}
                </div>
                <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{p.desc}</p>
              </button>
            ))}
          </div>
        </Section>

        <Section title="Gaming preference">
          <div className="rounded-xl border border-border bg-card p-4 flex items-center justify-between">
            <div>
              <div className="text-sm font-medium">Is gaming a distraction?</div>
              <p className="text-xs text-muted-foreground">If yes, LyfOpt will count gaming-like sessions as distractions for metrics.</p>
            </div>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={gamingIsDistraction} onChange={(e) => setGamingIsDistraction(e.target.checked)} />
                <span className="text-sm">Yes</span>
              </label>
            </div>
          </div>
        </Section>

        <Section title="Feedback style">
          <div className="space-y-2">
            {styles.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setStyle(s.id)}
                className={cn(
                  "w-full text-left rounded-xl border p-4 transition-all flex items-start gap-3",
                  style === s.id
                    ? "border-primary bg-primary/5"
                    : "border-border bg-card hover:border-primary/30",
                )}
              >
                <span
                  className={cn(
                    "mt-0.5 grid h-5 w-5 place-items-center rounded-full border shrink-0",
                    style === s.id ? "border-primary bg-primary" : "border-border",
                  )}
                >
                  {style === s.id && <Check className="h-3 w-3 text-primary-foreground" />}
                </span>
                <div>
                  <div className="text-sm font-medium">{s.label}</div>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{s.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </Section>

        <Section title="Onboarding data">
          <div className="rounded-xl border border-border bg-card p-5 space-y-2 text-sm">
            <Row label="Baseline" value={profile?.baseline_type ?? "—"} />
            <Row label="Patterns" value={profile?.failure_patterns?.join(", ") || "—"} />
            <Row label="Mood at start" value={String(profile?.mood_level ?? "—")} />
          </div>
          <Button
            variant="glow"
            size="sm"
            className="mt-3"
            onClick={() => router.push("/onboarding")}
          >
            Re-run onboarding
          </Button>
        </Section>

        <div className="flex flex-wrap gap-3 pt-4 border-t border-border">
          <Button variant="hero" onClick={() => void save()}>
            Save changes
          </Button>
          <Button variant="ghost" onClick={logout} className="text-muted-foreground">
            <LogOut className="h-4 w-4" /> Sign out
          </Button>
        </div>
      </div>
    </>
  );
};

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section>
    <Label className="text-[11px] uppercase tracking-widest text-muted-foreground">{title}</Label>
    <div className="mt-3">{children}</div>
  </section>
);

const Row = ({ label, value }: { label: string; value: string }) => (
  <div className="flex items-baseline justify-between gap-4">
    <span className="text-muted-foreground text-xs uppercase tracking-wider">{label}</span>
    <span className="text-foreground text-sm text-right truncate">{value}</span>
  </div>
);

export default Settings;

