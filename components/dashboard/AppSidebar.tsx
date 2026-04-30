"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  PenLine,
  Lightbulb,
  History,
  FileBarChart,
  Settings,
  Sparkles,
  Target,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

const items = [
  { title: "Dashboard", url: "/app", icon: LayoutDashboard, end: true },
  { title: "Daily Log", url: "/app/log", icon: PenLine },
  { title: "Goals", url: "/app/goals", icon: Target },
  { title: "Insights", url: "/app/insights", icon: Lightbulb },
  { title: "History", url: "/app/history", icon: History },
  { title: "Reports", url: "/app/reports", icon: FileBarChart },
  { title: "Settings", url: "/app/settings", icon: Settings },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const pathname = usePathname();

  const isActive = (url: string, end?: boolean) =>
    end ? pathname === url : pathname === url || pathname.startsWith(url + "/");

  return (
    <Sidebar collapsible="icon" className="border-r border-border">
      <SidebarHeader className="h-16 border-b border-border px-3 flex flex-row items-center">
        <Link href="/app" className="flex items-center gap-2.5 font-display font-semibold">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary shadow-glow shrink-0">
            <Sparkles className="h-4 w-4 text-primary-foreground" />
          </span>
          {!collapsed && <span className="text-base tracking-tight">LyfOpt</span>}
        </Link>
      </SidebarHeader>

      <SidebarContent className="pt-3">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => {
                const active = isActive(item.url, item.end);
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={active} tooltip={item.title}>
                      <Link
                        href={item.url}
                        className={cn(
                          "flex items-center gap-3 rounded-md transition-all",
                          active
                            ? "bg-primary/10 text-primary border-l-2 border-primary"
                            : "text-muted-foreground hover:text-foreground hover:bg-card",
                        )}
                      >
                        <item.icon className="h-4 w-4 shrink-0" />
                        {!collapsed && <span className="text-sm">{item.title}</span>}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}

