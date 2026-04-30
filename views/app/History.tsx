"use client";

import { useMemo } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { AppLayout } from "@/components/dashboard/AppLayout";
import { generateHistory } from "@/lib/mockData";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const History = () => {
  const history = useMemo(() => generateHistory(30).slice().reverse(), []);

  return (
    <AppLayout title="History">
      <div className="px-4 md:px-8 py-6 md:py-10 max-w-3xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="font-display text-2xl md:text-3xl font-semibold">History</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Every logged day. Click one to revisit the full analysis.
          </p>
        </motion.div>

        <div className="mt-8 rounded-2xl border border-border bg-card overflow-hidden">
          {history.map((d, i) => {
            const status = d.score >= 65 ? "good" : d.score >= 40 ? "ok" : "bad";
            return (
              <Link
                key={d.date}
                href="/app/analysis"
                className={cn(
                  "flex items-center gap-4 px-5 py-4 hover:bg-background/40 transition-colors group",
                  i !== 0 && "border-t border-border",
                )}
              >
                <span
                  className={cn(
                    "h-2 w-2 rounded-full shrink-0",
                    status === "good" && "bg-primary",
                    status === "ok" && "bg-yellow-400",
                    status === "bad" && "bg-destructive",
                  )}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-3">
                    <div className="font-mono text-sm text-foreground">{d.date}</div>
                    <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                      Score {d.score}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 truncate">{d.summary}</p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </Link>
            );
          })}
        </div>
      </div>
    </AppLayout>
  );
};

export default History;

