"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { AppLayout } from "@/components/dashboard/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Target, Trash2 } from "lucide-react";
import { addGoal, deleteGoal, getGoals, type Goal } from "@/lib/sessions";

const Goals = () => {
  const [goals, setGoals] = useState<Goal[]>(getGoals());
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("study");
  const [type, setType] = useState<"short_term" | "long_term">("long_term");
  const [keywords, setKeywords] = useState("");

  const create = () => {
    if (!title.trim()) return;
    addGoal({
      title: title.trim(),
      category,
      type,
      keywords: keywords.split(",").map((k) => k.trim()).filter(Boolean),
    });
    setGoals(getGoals());
    setTitle("");
    setKeywords("");
  };

  const remove = (id: string) => {
    deleteGoal(id);
    setGoals(getGoals());
  };

  return (
    <AppLayout title="Goals">
      <div className="px-4 md:px-8 py-6 md:py-10 max-w-4xl mx-auto space-y-6">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="font-display text-2xl md:text-3xl font-semibold tracking-tight">Goals</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Define what matters. Sessions matching these keywords count toward your goal score.
          </p>
        </motion.div>

        <div className="rounded-2xl border border-border bg-card p-5 md:p-6 space-y-4">
          <div className="grid md:grid-cols-12 gap-3">
            <div className="md:col-span-5 space-y-2">
              <Label className="text-xs">Goal title</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Get better at football"
                className="bg-background border-border h-10"
              />
            </div>
            <div className="md:col-span-3 space-y-2">
              <Label className="text-xs">Category</Label>
              <Input
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="football"
                className="bg-background border-border h-10"
              />
            </div>
            <div className="md:col-span-2 space-y-2">
              <Label className="text-xs">Type</Label>
              <Select value={type} onValueChange={(v) => setType(v as "short_term" | "long_term")}>
                <SelectTrigger className="bg-background border-border h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="short_term">Short term</SelectItem>
                  <SelectItem value="long_term">Long term</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2 flex items-end">
              <Button onClick={create} variant="hero" className="w-full h-10" disabled={!title.trim()}>
                <Plus className="h-4 w-4" /> Add
              </Button>
            </div>
            <div className="md:col-span-12 space-y-2">
              <Label className="text-xs">Keywords (comma separated)</Label>
              <Input
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
                placeholder="football, training, soccer"
                className="bg-background border-border h-10"
              />
            </div>
          </div>
        </div>

        <div className="space-y-2">
          {goals.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">No goals yet.</p>
          )}
          {goals.map((g) => (
            <div
              key={g.id}
              className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3"
            >
              <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10 border border-primary/30">
                <Target className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-foreground">{g.title}</div>
                <div className="text-[11px] text-muted-foreground">
                  {g.type.replace("_", " ")} · {g.category} · keywords: {g.keywords.join(", ") || "—"}
                </div>
              </div>
              <button
                onClick={() => remove(g.id)}
                className="text-muted-foreground hover:text-destructive transition-colors"
                aria-label="Delete goal"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  );
};

export default Goals;

