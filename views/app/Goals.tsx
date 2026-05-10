"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/components/site/AuthProvider";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { BrainCircuit, Sparkles, Trash2 } from "lucide-react";
import {
  addGoalToDb,
  deleteGoalFromDb,
  fetchGoalsFromDb,
  type Goal,
} from "@/lib/sessions";
import { inferGoalDraft } from "@/lib/utils";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/error";

const Goals = () => {
  const { user, loading } = useAuth();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [prompt, setPrompt] = useState("");
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      if (loading || !user) return;
      try {
        const rows = await fetchGoalsFromDb();
        if (active) setGoals(rows.filter((goal) => goal.is_active));
      } catch (error) {
        if (active) {
          setGoals([]);
          setLoadError(getErrorMessage(error));
        }
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, [loading, user]);

  const draft = useMemo(() => inferGoalDraft(prompt), [prompt]);

  const create = async () => {
    if (!prompt.trim()) return;
    try {
      await addGoalToDb({
        title: draft.title,
        category: draft.category,
        type: draft.type,
        priority: draft.priority,
        time_horizon: draft.timeHorizon,
        identity_tag: draft.identityTag,
        open_ended: draft.openEnded,
        target_value: null,
        target_unit: null,
        keywords: draft.keywords,
      });
      setGoals(await fetchGoalsFromDb());
      setPrompt("");
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const remove = async (id: string) => {
    try {
      await deleteGoalFromDb(id);
      setGoals(await fetchGoalsFromDb());
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  return (
    <div className="px-4 md:px-8 py-6 md:py-10 max-w-5xl mx-auto space-y-8">
      {loadError && (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-foreground">
          {loadError}
        </div>
      )}

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
        <div className="text-xs uppercase tracking-[0.28em] text-muted-foreground">Identity</div>
        <h1 className="max-w-3xl font-display text-3xl md:text-5xl font-semibold tracking-tight text-foreground">
          Define what you are trying to become, not what dropdowns can describe.
        </h1>
        <p className="max-w-2xl text-sm md:text-base text-muted-foreground">
          Write the goal naturally. LyfOpt infers the tracking language, keywords, and identity frame behind it.
        </p>
      </motion.div>

      <section className="rounded-[28px] border border-border bg-card p-6 md:p-8 space-y-5 shadow-sm">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <BrainCircuit className="h-4 w-4 text-primary" />
          AI-assisted goal framing
        </div>
        <Textarea
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          placeholder="Become a stronger football player who trains consistently under pressure"
          className="min-h-28 border-border bg-background text-base leading-relaxed"
        />
        <div className="grid gap-4 md:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5">
            <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Identity</div>
            <div className="mt-2 text-lg font-medium text-foreground">{draft.title || "Your goal will appear here"}</div>
            <p className="mt-2 text-sm text-muted-foreground">{draft.identityTag}</p>
          </div>
          <div className="rounded-2xl border border-border bg-background p-5">
            <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Inferred signals</div>
            <div className="mt-3 flex flex-wrap gap-2">
              {draft.keywords.map((keyword) => (
                <span key={keyword} className="rounded-full border border-border px-3 py-1 text-xs text-foreground">
                  {keyword}
                </span>
              ))}
            </div>
            <div className="mt-3 text-xs text-muted-foreground">
              {draft.priority} priority · {draft.timeHorizon} rhythm · {draft.category}
            </div>
          </div>
        </div>
        <Button onClick={() => void create()} variant="hero" size="lg" disabled={!prompt.trim()}>
          <Sparkles className="h-4 w-4" />
          Create goal
        </Button>
      </section>

      <section className="space-y-4">
        <div>
          <div className="text-xs uppercase tracking-[0.28em] text-muted-foreground">Active goals</div>
          <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight">Your identity stack</h2>
        </div>

        {goals.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-8 text-sm text-muted-foreground">
            No goals yet. Start with one clear identity-level goal and let the system build around it.
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {goals.map((goal) => (
              <div key={goal.id} className="rounded-[24px] border border-border bg-card p-5 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">{goal.category}</div>
                    <div className="mt-2 text-xl font-medium text-foreground">{goal.title}</div>
                    <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                      {goal.identity_tag || "A clearer identity statement will appear here once this goal is refined."}
                    </p>
                  </div>
                  <button
                    onClick={() => void remove(goal.id)}
                    className="text-muted-foreground transition-colors hover:text-destructive"
                    aria-label="Delete goal"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <div className="mt-5 flex flex-wrap gap-2">
                  {goal.keywords.map((keyword) => (
                    <span key={keyword} className="rounded-full border border-border px-3 py-1 text-xs text-foreground/85">
                      {keyword}
                    </span>
                  ))}
                </div>
                <div className="mt-5 flex items-center justify-between text-xs text-muted-foreground">
                  <span>{goal.priority} priority</span>
                  <span>{goal.time_horizon}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default Goals;
