import { Link, useRouterState } from "@tanstack/react-router";
import { Activity, Gauge, LineChart, Sliders, Download, Moon, Sun, Database } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/hooks/use-theme";
import { Button } from "@/components/ui/button";
import type { ReactNode } from "react";

const nav = [
  { to: "/", label: "Dashboard", icon: Activity },
  { to: "/unit-economics", label: "Unit Economics", icon: Gauge },
  { to: "/runway", label: "Runway & Burn", icon: LineChart },
  { to: "/scenario", label: "Scenario Planner", icon: Sliders },
  { to: "/financial-hub", label: "Financial Hub", icon: Database },
  { to: "/export", label: "Export", icon: Download },
] as const;

export function AppLayout({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const { theme, toggle } = useTheme();

  return (
    <div className="min-h-screen flex w-full bg-background text-foreground">
      {/* Sidebar */}
      <aside className="hidden md:flex w-60 flex-col border-r border-border bg-sidebar sticky top-0 h-screen">
        <div className="px-5 py-5 border-b border-border">
          <Link to="/" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-chart-5 flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">U</span>
            </div>
            <div className="leading-tight">
              <div className="font-semibold tracking-tight">UnitFlow</div>
              <div className="text-[10px] uppercase text-muted-foreground tracking-widest">
                Finance engine
              </div>
            </div>
          </Link>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {nav.map((item) => {
            const active = pathname === item.to;
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-border">
          <Button variant="ghost" size="sm" className="w-full justify-start gap-2" onClick={toggle}>
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            <span className="text-sm">{theme === "dark" ? "Light mode" : "Dark mode"}</span>
          </Button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile top bar */}
        <header className="md:hidden flex items-center justify-between px-4 py-3 border-b border-border bg-sidebar sticky top-0 z-10">
          <Link to="/" className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-md bg-gradient-to-br from-primary to-chart-5 flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-xs">U</span>
            </div>
            <span className="font-semibold">UnitFlow</span>
          </Link>
          <Button variant="ghost" size="icon" onClick={toggle}>
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
        </header>

        {/* Mobile nav strip */}
        <nav className="md:hidden flex overflow-x-auto gap-1 p-2 border-b border-border bg-sidebar">
          {nav.map((item) => {
            const active = pathname === item.to;
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs whitespace-nowrap",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    : "text-muted-foreground",
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  );
}
