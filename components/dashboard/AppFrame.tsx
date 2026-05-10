"use client";

import { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { AppLayout } from "./AppLayout";

const titles: Record<string, string> = {
  "/app": "Today",
  "/app/log": "Capture",
  "/app/analysis": "Today",
  "/app/goals": "Goals",
  "/app/patterns": "Patterns",
  "/app/insights": "Patterns",
  "/app/history": "Patterns",
  "/app/monthly": "Reflection",
  "/app/reflection": "Reflection",
  "/app/reports": "Patterns",
  "/app/settings": "Settings",
};

export const AppFrame = ({ children }: { children: ReactNode }) => {
  const pathname = usePathname();
  const title = titles[pathname] ?? "LyfOpt";

  return (
    <AppLayout title={title}>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={pathname}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="min-h-full"
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </AppLayout>
  );
};
