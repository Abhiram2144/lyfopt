"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  BrainCircuit,
  CalendarRange,
  LayoutDashboard,
  PenLine,
  Settings,
  Sparkles,
  Target,
} from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { title: "Today", url: "/app", icon: LayoutDashboard, end: true },
  { title: "Capture", url: "/app/log", icon: PenLine },
  { title: "Goals", url: "/app/goals", icon: Target },
  { title: "Patterns", url: "/app/patterns", icon: BrainCircuit },
  { title: "Reflection", url: "/app/reflection", icon: CalendarRange },
  { title: "Settings", url: "/app/settings", icon: Settings },
];

export function AppSidebar() {
  const pathname = usePathname();
  const [width, setWidth] = useState<number>(() => {
    if (typeof window === "undefined") return 280;
    try {
      const saved = window.localStorage.getItem("lyfopt:sidebarWidth");
      return saved ? Number(saved) : 280;
    } catch {
      return 280;
    }
  });
  const [dragging, setDragging] = useState(false);
  const widthRef = useRef(width);
  const dragStartX = useRef(0);
  const dragStartWidth = useRef(width);

  useEffect(() => {
    widthRef.current = width;
  }, [width]);

  useEffect(() => {
    const onMove = (event: PointerEvent) => {
      if (!dragging) return;
      event.preventDefault();
      const delta = event.clientX - dragStartX.current;
      const nextWidth = Math.max(220, Math.min(420, dragStartWidth.current + delta));
      widthRef.current = nextWidth;
      setWidth(nextWidth);
    };

    const onUp = () => {
      if (!dragging) return;
      setDragging(false);
      try {
        window.localStorage.setItem("lyfopt:sidebarWidth", String(widthRef.current));
      } catch {
        // ignore storage errors
      }
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [dragging, width]);

  const startDrag = (event: React.PointerEvent<HTMLButtonElement>) => {
    dragStartX.current = event.clientX;
    dragStartWidth.current = widthRef.current;
    setDragging(true);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const isActive = (url: string, end?: boolean) =>
    end ? pathname === url : pathname === url || pathname.startsWith(`${url}/`);

  const sidebarWidthStyle = useMemo(() => ({ width: `${width}px` }), [width]);

  return (
    <aside
      className="relative flex h-screen shrink-0 border-r border-border bg-card/95 text-foreground"
      style={sidebarWidthStyle}
    >
      <div className="flex h-full w-full flex-col overflow-hidden">
        <div className="flex h-16 items-center border-b border-border px-4">
          <Link href="/app" className="flex items-center gap-2.5 font-display font-semibold">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary shadow-glow shrink-0">
              <Sparkles className="h-4 w-4 text-primary-foreground" />
            </span>
            <span className="text-base tracking-tight">LyfOpt</span>
          </Link>
        </div>

        <nav className="flex-1 overflow-y-auto p-3">
          <ul className="flex flex-col gap-1">
            {items.map((item) => {
              const active = isActive(item.url, item.end);
              return (
                <li key={item.title}>
                  <Link
                    href={item.url}
                    className={cn(
                      "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                      active
                        ? "bg-primary/10 text-primary border-l-2 border-primary"
                        : "text-muted-foreground hover:bg-card hover:text-foreground",
                    )}
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    <span>{item.title}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>

      <button
        type="button"
        aria-label="Resize sidebar"
        onPointerDown={startDrag}
        className={cn(
          "absolute right-0 top-0 h-full w-2 cursor-col-resize bg-transparent transition-colors",
          dragging ? "bg-border/70" : "hover:bg-border/60",
        )}
      />
    </aside>
  );
}
