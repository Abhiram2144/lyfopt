"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AppLayout } from "@/components/dashboard/AppLayout";
import { generateHistory } from "@/lib/mockData";
import { Lightbulb, TrendingUp, TrendingDown } from "lucide-react";

const Insights = () => {
  const history = useMemo(() => generateHistory(30), []);
  const data = history.map((d) => ({
    date: d.date.slice(5),
    score: d.score,
    sleep: d.sleep,
  }));

  const insights = [
    {
      icon: TrendingUp,
      tone: "good" as const,
      text: "You are most productive when sleep > 7h. Average score jumps by 27 points.",
    },
    {
      icon: TrendingDown,
      tone: "bad" as const,
      text: "Distraction over 2h drops your focus the next morning by 41%.",
    },
    {
      icon: Lightbulb,
      tone: "neutral" as const,
      text: "Tuesdays are your strongest day. Fridays consistently underperform.",
    },
    {
      icon: TrendingUp,
      tone: "good" as const,
      text: "Days with physical activity show 18% higher energy scores on average.",
    },
  ];

  return (
    <AppLayout title="Insights">
      <div className="px-4 md:px-8 py-6 md:py-10 max-w-[1200px] mx-auto space-y-6">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="font-display text-2xl md:text-3xl font-semibold">Long-term patterns</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            What your last 30 days reveal about how you actually operate.
          </p>
        </motion.div>

        <div className="rounded-2xl border border-border bg-card p-5 md:p-6">
          <div className="flex items-baseline justify-between mb-4">
            <h3 className="font-display text-sm font-medium">Daily score trend</h3>
            <span className="text-[11px] text-muted-foreground uppercase tracking-wider">
              30 days
            </span>
          </div>
          <div className="h-72 -ml-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data}>
                <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="date"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="score" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          {insights.map((it, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="rounded-2xl border border-border bg-card p-5 hover:border-primary/30 transition-colors"
            >
              <div className="flex items-start gap-3">
                <div
                  className={`grid h-9 w-9 place-items-center rounded-lg border shrink-0 ${
                    it.tone === "good"
                      ? "bg-primary/10 border-primary/30 text-primary"
                      : it.tone === "bad"
                        ? "bg-destructive/10 border-destructive/30 text-destructive"
                        : "bg-muted border-border text-foreground"
                  }`}
                >
                  <it.icon className="h-4 w-4" />
                </div>
                <p className="text-sm text-foreground/90 leading-relaxed">{it.text}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </AppLayout>
  );
};

export default Insights;

