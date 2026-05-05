"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, ChevronLeft, ChevronRight, Sparkles, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/components/site/AuthProvider";
import { fetchGoalsFromDb, fetchMonthlyReviewForMonthFromDb, saveMonthlyReviewToDb, type Goal } from "@/lib/sessions";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { getErrorMessage } from "@/lib/error";

const lifeOptions = ["Chaotic", "Inconsistent", "Improving", "Disciplined"];
const energyOptions = ["Very low", "Inconsistent", "Stable", "High"];
const timeOptions = ["Yes", "Somewhat", "No"];
const problemOptions = ["Distractions", "Low energy", "Inconsistency", "Lack of direction"];

const stepLabels = [
  "Self-Perception",
  "Time Awareness",
  "Goal Reflection",
  "Problems",
  "Reflection",
  "Forward Focus",
];

const MonthlyReview = () => {
  const { user, loading } = useAuth();
  const monthStart = new Date();
  monthStart.setDate(1);
  const monthKey = `${monthStart.getFullYear()}-${String(monthStart.getMonth() + 1).padStart(2, "0")}-01`;

  const [goals, setGoals] = useState<Goal[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [locked, setLocked] = useState(false);

  useEffect(() => {
    let active = true;
    const load = async () => {
      if (loading || !user) return;
      try {
        const [rows, existingReview] = await Promise.all([
          fetchGoalsFromDb(),
          fetchMonthlyReviewForMonthFromDb(monthKey),
        ]);
        if (active) setGoals(rows.filter((goal) => goal.is_active));
        if (active && existingReview) {
          setAnswers(existingReview.answers as Record<string, string>);
          setSubmitted(true);
          setLocked(true);
        }
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
  }, [loading, monthKey, user]);
  const [step, setStep] = useState(1);
  const [submitted, setSubmitted] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const selectedProgressGoal = goals.find((goal) => goal.id === answers.progressGoalId);
  const selectedNeglectedGoal = goals.find((goal) => goal.id === answers.neglectedGoalId);
  const selectedPriorityGoal = goals.find((goal) => goal.id === answers.priorityGoalId);

  const alignmentScore = useMemo(() => {
    let score = 40;
    if (answers.lifeFeel === "Disciplined") score += 15;
    if (answers.lifeFeel === "Improving") score += 10;
    if (answers.energy === "High") score += 10;
    if (answers.energy === "Stable") score += 6;
    if (answers.timeWell === "Yes") score += 15;
    if (answers.progressGoalId) score += 8;
    if (answers.neglectedGoalId) score -= 6;
    if (answers.problem === "Distractions") score -= 5;
    if (answers.problem === "Low energy") score -= 4;
    return Math.max(0, Math.min(100, score));
  }, [answers]);

  const biggestProblem = answers.problem ?? "Not enough signal yet";
  const biggestImprovement = selectedProgressGoal?.title || answers.didWell?.trim() || "More consistent awareness";
  const focusForNextMonth = selectedPriorityGoal?.title || answers.fixNext?.trim() || "Choose one goal and protect it daily";

  const aiInsight = useMemo(() => {
    const tone = answers.lifeFeel ?? "this month";
    const energy = answers.energy ?? "your energy";
    const problem = answers.problem ?? "the friction";
    const fix = answers.fixNext?.trim();

    return [
      `You described the month as ${tone.toLowerCase()}, with ${energy.toLowerCase()} energy.`,
      `The main pattern appears to be ${problem.toLowerCase()}, which likely affected your ability to stay aligned with what matters.`,
      fix ? `Next month should be about making ${fix.toLowerCase()} concrete and repeatable.` : "Next month should be about reducing friction and making the next good decision easier.",
    ].join(" ");
  }, [answers]);

  const save = async () => {
    if (locked) return;
    try {
      await saveMonthlyReviewToDb({ month_start: monthKey, answers });
      toast.success("Monthly review saved");
      setSubmitted(true);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const canProceed = (currentStep: number) => {
    if (currentStep === 1) return Boolean(answers.lifeFeel && answers.energy);
    if (currentStep === 2) return Boolean(answers.timeWell);
    if (currentStep === 3) return Boolean(answers.progressGoalId || answers.neglectedGoalId || goals.length === 0);
    if (currentStep === 4) return Boolean(answers.problem);
    if (currentStep === 5) return Boolean(answers.regret?.trim() && answers.didWell?.trim());
    if (currentStep === 6) return Boolean(answers.fixNext?.trim() && (answers.priorityGoalId || goals.length === 0));
    return false;
  };

  const next = () => setStep((value) => Math.min(6, value + 1));
  const back = () => setStep((value) => Math.max(1, value - 1));

  const goalCard = (goal: Goal) => {
    const active = answers.progressGoalId === goal.id || answers.neglectedGoalId === goal.id || answers.priorityGoalId === goal.id;
    return (
      <button
        key={goal.id}
        type="button"
        onClick={() => {
          if (step === 3) {
            setAnswers((current) => ({
              ...current,
              progressGoalId: current.progressGoalId === goal.id ? "" : goal.id,
            }));
          }
          if (step === 6) {
            setAnswers((current) => ({
              ...current,
              priorityGoalId: goal.id,
            }));
          }
        }}
        className={cn(
          "group rounded-2xl border p-4 text-left transition-all duration-300",
          active
            ? "border-[#1DCD9F] bg-[#1DCD9F]/10 shadow-[0_0_0_1px_rgba(29,205,159,0.25)]"
            : "border-white/10 bg-[#222] hover:border-white/20 hover:bg-[#252525]",
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-base font-medium text-white">{goal.title}</div>
            <div className="mt-1 text-xs uppercase tracking-[0.24em] text-white/45">
              {goal.open_ended ? "Open-ended" : `Measurable · ${goal.target_value ?? "—"} ${goal.target_unit ?? ""}`}
            </div>
          </div>
          <div className={cn("mt-0.5 grid h-5 w-5 place-items-center rounded-full border", active ? "border-[#1DCD9F] bg-[#1DCD9F]" : "border-white/20")}> 
            {active && <Check className="h-3 w-3 text-black" />}
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {goal.keywords.slice(0, 3).map((keyword) => (
            <span key={keyword} className="rounded-full border border-white/10 px-2.5 py-1 text-[11px] text-white/65">
              {keyword}
            </span>
          ))}
        </div>
      </button>
    );
  };

  return (
    <>
      <div className="min-h-[calc(100svh-4rem)] bg-black text-white">
        <div className="mx-auto flex min-h-[calc(100svh-4rem)] w-full max-w-6xl flex-col px-4 py-6 md:px-8 md:py-8">
          {loadError && (
            <div className="mb-4 rounded-2xl border border-white/15 bg-white/5 p-4 text-sm text-white/80">
              {loadError}
            </div>
          )}

          {locked && (
            <div className="mb-4 rounded-2xl border border-[#1DCD9F]/30 bg-[#1DCD9F]/10 p-4 text-sm text-white/80">
              This month already has a review. It is now read-only.
            </div>
          )}

          <div className="mb-5 flex items-center justify-between text-[11px] uppercase tracking-[0.28em] text-white/45">
            <span>LyfOpt monthly reflection</span>
            <span>Step {submitted ? 6 : step} of 6</span>
          </div>

          <div className="mb-8 h-1.5 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-[#1DCD9F] transition-all duration-500"
              style={{ width: `${submitted ? 100 : (step / 6) * 100}%` }}
            />
          </div>

          {!submitted ? (
            <div className="flex flex-1 items-center justify-center">
              <AnimatePresence mode="wait">
                <motion.section
                  key={step}
                  initial={{ opacity: 0, y: 18, scale: 0.985 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -12, scale: 0.985 }}
                  transition={{ duration: 0.35, ease: "easeOut" }}
                  className="w-full max-w-4xl rounded-4xl border border-white/10 bg-[#222] p-6 shadow-[0_30px_80px_rgba(0,0,0,0.45)] md:p-10"
                >
                  <div className="mb-8 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                    <div>
                      <div className="mb-2 text-[11px] uppercase tracking-[0.28em] text-[#1DCD9F]">
                        Step {step}
                      </div>
                      <h1 className="max-w-2xl text-3xl font-semibold tracking-tight text-white md:text-5xl">
                        {stepLabels[step - 1]}
                      </h1>
                    </div>
                    <p className="max-w-md text-sm leading-relaxed text-white/55">
                      A guided reflection, not a survey. Slow down, look at the month honestly, then turn it into a sharper next move.
                    </p>
                  </div>

                  <AnimatePresence mode="wait">
                    <motion.div
                      key={step}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.25 }}
                      className="space-y-8"
                    >
                      {step === 1 && (
                        <div className="grid gap-6 md:grid-cols-2">
                          <QuestionGroup title="How did your life feel this month?">
                            {lifeOptions.map((option) => (
                              <ChoicePill
                                key={option}
                                active={answers.lifeFeel === option}
                                onClick={() => setAnswers((current) => ({ ...current, lifeFeel: option }))}
                              >
                                {option}
                              </ChoicePill>
                            ))}
                          </QuestionGroup>
                          <QuestionGroup title="How was your energy overall?">
                            <br/>
                            {energyOptions.map((option) => (
                              <ChoicePill
                                key={option}
                                active={answers.energy === option}
                                onClick={() => setAnswers((current) => ({ ...current, energy: option }))}
                              >
                                {option}
                              </ChoicePill>
                            ))}
                          </QuestionGroup>
                        </div>
                      )}

                      {step === 2 && (
                        <QuestionGroup title="Do you think you used your time well this month?">
                          <div className="grid gap-3 md:grid-cols-3">
                            {timeOptions.map((option) => (
                              <ChoicePill
                                key={option}
                                active={answers.timeWell === option}
                                onClick={() => setAnswers((current) => ({ ...current, timeWell: option }))}
                                wide
                              >
                                {option}
                              </ChoicePill>
                            ))}
                          </div>
                        </QuestionGroup>
                      )}

                      {step === 3 && (
                        <div className="space-y-6">
                          <div className="grid gap-5 lg:grid-cols-2">
                            <QuestionGroup title="Which goal did you actually make progress on?">
                              <div className="grid gap-3">
                                {goals.length === 0 ? (
                                  <EmptyState message="No active goals found." />
                                ) : (
                                  goals.map((goal) => goalCard(goal))
                                )}
                              </div>
                            </QuestionGroup>

                            <QuestionGroup title="Which goal did you neglect?">
                              <div className="grid gap-3">
                                {goals.length === 0 ? (
                                  <EmptyState message="No active goals found." />
                                ) : (
                                  goals.map((goal) => (
                                    <button
                                      key={goal.id}
                                      type="button"
                                      onClick={() => setAnswers((current) => ({ ...current, neglectedGoalId: goal.id }))}
                                      className={cn(
                                        "rounded-2xl border p-4 text-left transition-all duration-300",
                                        answers.neglectedGoalId === goal.id
                                          ? "border-[#1DCD9F] bg-[#1DCD9F]/10"
                                          : "border-white/10 bg-[#222] hover:border-white/20 hover:bg-[#252525]",
                                      )}
                                    >
                                      <div className="text-base font-medium">{goal.title}</div>
                                      <div className="mt-1 text-xs text-white/50">
                                        {goal.open_ended ? "Open-ended" : `${goal.target_value ?? "—"} ${goal.target_unit ?? ""}`}
                                      </div>
                                    </button>
                                  ))
                                )}
                              </div>
                            </QuestionGroup>
                          </div>

                          {selectedProgressGoal && (
                            <div className="rounded-2xl border border-[#1DCD9F]/30 bg-[#1DCD9F]/10 p-4 text-sm text-white/80">
                              You marked <span className="font-medium text-white">{selectedProgressGoal.title}</span> as the goal you moved forward.
                            </div>
                          )}
                        </div>
                      )}

                      {step === 4 && (
                        <QuestionGroup title="What held you back the most?">
                          <div className="grid gap-3 md:grid-cols-2">
                            {problemOptions.map((option) => (
                              <ChoicePill
                                key={option}
                                active={answers.problem === option}
                                onClick={() => setAnswers((current) => ({ ...current, problem: option }))}
                                wide
                              >
                                {option}
                              </ChoicePill>
                            ))}
                          </div>
                        </QuestionGroup>
                      )}

                      {step === 5 && (
                        <div className="grid gap-6 lg:grid-cols-2">
                          <QuestionGroup title="What is one thing you regret this month?">
                            <Textarea
                              value={answers.regret ?? ""}
                              onChange={(event) => setAnswers((current) => ({ ...current, regret: event.target.value }))}
                              placeholder="Write what felt off, wasted, or unfinished..."
                              className="min-h-45 border-white/10 bg-black/30 text-base text-white placeholder:text-white/25 focus-visible:ring-[#1DCD9F]"
                            />
                          </QuestionGroup>
                          <QuestionGroup title="What is one thing you did well?">
                            <Textarea
                              value={answers.didWell ?? ""}
                              onChange={(event) => setAnswers((current) => ({ ...current, didWell: event.target.value }))}
                              placeholder="What worked, even if it was small?"
                              className="min-h-45 border-white/10 bg-black/30 text-base text-white placeholder:text-white/25 focus-visible:ring-[#1DCD9F]"
                            />
                          </QuestionGroup>
                        </div>
                      )}

                      {step === 6 && (
                        <div className="grid gap-6 lg:grid-cols-2">
                          <QuestionGroup title="What should you fix next month?">
                            <Textarea
                              value={answers.fixNext ?? ""}
                              onChange={(event) => setAnswers((current) => ({ ...current, fixNext: event.target.value }))}
                              placeholder="Make it concrete: a behavior, system, or boundary."
                              className="min-h-45 border-white/10 bg-black/30 text-base text-white placeholder:text-white/25 focus-visible:ring-[#1DCD9F]"
                            />
                          </QuestionGroup>

                          <QuestionGroup title="What will you prioritize?">
                            <div className="space-y-3">
                              {goals.length === 0 ? (
                                <EmptyState message="No active goals found." />
                              ) : (
                                goals.map((goal) => (
                                  <button
                                    key={goal.id}
                                    type="button"
                                    onClick={() => setAnswers((current) => ({ ...current, priorityGoalId: goal.id }))}
                                    className={cn(
                                      "w-full rounded-2xl border p-4 text-left transition-all duration-300",
                                      answers.priorityGoalId === goal.id
                                        ? "border-[#1DCD9F] bg-[#1DCD9F]/10"
                                        : "border-white/10 bg-[#222] hover:border-white/20 hover:bg-[#252525]",
                                    )}
                                  >
                                    <div className="text-base font-medium text-white">{goal.title}</div>
                                    <div className="mt-1 text-xs text-white/50">
                                      {goal.open_ended ? "Open-ended" : `${goal.target_value ?? "—"} ${goal.target_unit ?? ""}`}
                                    </div>
                                  </button>
                                ))
                              )}
                            </div>
                          </QuestionGroup>
                        </div>
                      )}
                    </motion.div>
                  </AnimatePresence>

                  <div className="mt-10 flex flex-col gap-3 border-t border-white/10 pt-6 md:flex-row md:items-center md:justify-between">
                    <div className="text-sm text-white/45">
                      {step === 3 && selectedNeglectedGoal ? (
                        <span>
                          Neglected: <span className="text-white">{selectedNeglectedGoal.title}</span>
                        </span>
                      ) : step === 6 && selectedPriorityGoal ? (
                        <span>
                          Prioritizing: <span className="text-white">{selectedPriorityGoal.title}</span>
                        </span>
                      ) : (
                        <span>Keep moving through the reflection, one step at a time.</span>
                      )}
                    </div>

                    <div className="flex flex-col gap-3 sm:flex-row">
                      <Button
                        variant="ghost"
                        onClick={back}
                        disabled={step === 1}
                        className="border border-white/10 bg-transparent text-white hover:bg-white/5"
                      >
                        <ChevronLeft className="h-4 w-4" /> Back
                      </Button>
                      {step < 6 ? (
                        <Button
                          variant="hero"
                          onClick={next}
                          disabled={!canProceed(step)}
                          className="bg-[#1DCD9F] text-black hover:bg-[#1DCD9F]/90"
                        >
                          Next <ChevronRight className="h-4 w-4" />
                        </Button>
                      ) : (
                        <Button
                          variant="hero"
                          onClick={() => void save()}
                          disabled={!canProceed(step)}
                          className="bg-[#1DCD9F] text-black hover:bg-[#1DCD9F]/90"
                        >
                          Submit <Sparkles className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </motion.section>
              </AnimatePresence>
            </div>
          ) : (
            <div className="flex flex-1 items-center justify-center">
              <motion.section
                initial={{ opacity: 0, y: 18, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.35, ease: "easeOut" }}
                className="w-full max-w-4xl rounded-4xl border border-white/10 bg-[#222] p-6 shadow-[0_30px_80px_rgba(0,0,0,0.45)] md:p-10"
              >
                <div className="mb-6 flex items-center gap-3 text-[#1DCD9F]">
                  <Target className="h-5 w-5" />
                  <span className="text-[11px] uppercase tracking-[0.28em]">Monthly Reality Report</span>
                </div>

                <h2 className="max-w-2xl text-3xl font-semibold tracking-tight text-white md:text-5xl">
                  You finished the reflection.
                </h2>
                <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/55 md:text-base">
                  This is the honest version of the month. Use it to make the next month sharper, simpler, and more intentional.
                </p>

                <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  <ReportCard label="Alignment Score" value={`${alignmentScore}%`} accent />
                  <ReportCard label="Biggest Problem" value={biggestProblem} />
                  <ReportCard label="Biggest Improvement" value={biggestImprovement} />
                </div>

                <div className="mt-4 grid gap-4 xl:grid-cols-2">
                  <ReportCard label="AI Insight" value={aiInsight} large />
                  <ReportCard label="Focus for Next Month" value={focusForNextMonth} highlight />
                </div>

                <div className="mt-8 rounded-3xl border border-[#1DCD9F]/20 bg-[#1DCD9F]/10 p-5">
                  <div className="mb-2 text-[11px] uppercase tracking-[0.24em] text-[#1DCD9F]">Snapshot</div>
                  <div className="grid gap-2 text-sm text-white/70 md:grid-cols-2">
                    <div>
                      Life felt: <span className="text-white">{answers.lifeFeel ?? "—"}</span>
                    </div>
                    <div>
                      Energy: <span className="text-white">{answers.energy ?? "—"}</span>
                    </div>
                    <div>
                      Time use: <span className="text-white">{answers.timeWell ?? "—"}</span>
                    </div>
                    <div>
                      Main blocker: <span className="text-white">{answers.problem ?? "—"}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-8 flex flex-wrap gap-3">
                  {!locked && (
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setSubmitted(false);
                        setStep(6);
                      }}
                      className="border border-white/10 bg-transparent text-white hover:bg-white/5"
                    >
                      Review answers
                    </Button>
                  )}
                  <Button
                    variant="hero"
                    onClick={() => toast.success(locked ? "Monthly review already locked" : "Monthly report saved")}
                    className="bg-[#1DCD9F] text-black hover:bg-[#1DCD9F]/90"
                  >
                    Done
                  </Button>
                </div>
              </motion.section>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

const QuestionGroup = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="space-y-4">
    <Label className="text-[11px] uppercase tracking-[0.28em] text-white/45">{title}</Label>
    {children}
  </div>
);

const ChoicePill = ({
  active,
  onClick,
  children,
  wide = false,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  wide?: boolean;
}) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      "rounded-2xl border px-4 py-4 text-left text-base transition-all duration-300",
      wide ? "min-h-18" : "",
      active
        ? "border-[#1DCD9F] bg-[#1DCD9F]/10 text-white shadow-[0_0_0_1px_rgba(29,205,159,0.2)]"
        : "border-white/10 bg-black/30 text-white/75 hover:border-white/20 hover:bg-white/5 hover:text-white",
    )}
  >
    {children}
  </button>
);

const EmptyState = ({ message }: { message: string }) => (
  <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 px-4 py-6 text-sm text-white/45">
    {message}
  </div>
);

const ReportCard = ({
  label,
  value,
  accent = false,
  large = false,
  highlight = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
  large?: boolean;
  highlight?: boolean;
}) => (
  <div
    className={cn(
      "rounded-3xl border p-5",
      accent
        ? "border-[#1DCD9F]/25 bg-[#1DCD9F]/10"
        : highlight
          ? "border-white/10 bg-black/30"
          : "border-white/10 bg-black/20",
    )}
  >
    <div className="text-[11px] uppercase tracking-[0.26em] text-white/45">{label}</div>
    <div className={cn("mt-3 text-white", large ? "text-base leading-relaxed" : "text-2xl font-semibold tracking-tight")}>{value}</div>
  </div>
);

export default MonthlyReview;
