import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/unitflow";
import { RotateCcw, TrendingUp, Users, DollarSign } from "lucide-react";

export const Route = createFileRoute("/cohorts")({
  head: () => ({
    meta: [
      { title: "Cohort Retention Studio — UnitFlow" },
      { name: "description", content: "Cohort retention and NRR heatmap with editable scenarios." },
      { property: "og:title", content: "Cohort Retention Studio — UnitFlow" },
      { property: "og:description", content: "Interactive retention and NRR heatmap for early-stage startups." },
    ],
  }),
  component: CohortsPage,
});

type Mode = "retention" | "nrr";

const COHORT_LABELS = ["Jan 2026", "Feb 2026", "Mar 2026", "Apr 2026", "May 2026", "Jun 2026"];
const MONTHS = 6; // Month 0..5
const INITIAL_CUSTOMERS = [120, 145, 160, 180, 210, 240];
const ARPU = 90;

// Default retention curve (% of month 0)
const DEFAULT_RETENTION: number[][] = COHORT_LABELS.map((_, i) => {
  const drift = i * 1.2;
  return [100, 82 + drift, 71 + drift, 63 + drift, 58 + drift, 54 + drift].map((v) =>
    Math.min(100, Math.round(v)),
  );
});

// NRR includes expansion; starts at 100 and can exceed with upsells
const DEFAULT_NRR: number[][] = COHORT_LABELS.map((_, i) => {
  const boost = i * 1.5;
  return [100, 98 + boost, 101 + boost, 104 + boost, 107 + boost, 110 + boost].map((v) =>
    Math.round(v),
  );
});

function heatColor(value: number, mode: Mode) {
  // Higher = greener. For NRR the neutral point is 100.
  const v = mode === "nrr" ? value - 60 : value; // shift NRR into 0..100-ish
  if (v >= 90) return "bg-emerald-600/70 text-white";
  if (v >= 75) return "bg-emerald-500/60 text-white";
  if (v >= 60) return "bg-emerald-400/50 text-emerald-950 dark:text-emerald-50";
  if (v >= 45) return "bg-amber-400/50 text-amber-950 dark:text-amber-50";
  if (v >= 30) return "bg-amber-500/50 text-amber-950 dark:text-amber-50";
  return "bg-rose-500/40 text-rose-950 dark:text-rose-50";
}

function CohortsPage() {
  const [mode, setMode] = useState<Mode>("retention");
  const [retention, setRetention] = useState<number[][]>(DEFAULT_RETENTION);
  const [nrr, setNrr] = useState<number[][]>(DEFAULT_NRR);

  const grid = mode === "retention" ? retention : nrr;
  const setGrid = mode === "retention" ? setRetention : setNrr;

  const updateCell = (row: number, col: number, val: number) => {
    setGrid((prev) => {
      const next = prev.map((r) => [...r]);
      next[row][col] = Number.isFinite(val) ? Math.max(0, Math.min(200, val)) : 0;
      return next;
    });
  };

  const reset = () => {
    setRetention(DEFAULT_RETENTION);
    setNrr(DEFAULT_NRR);
  };

  const summary = useMemo(() => {
    // Avg Month 1 retention
    const m1 = retention.map((r) => r[1] ?? 0);
    const avgM1 = m1.reduce((a, b) => a + b, 0) / m1.length;

    // 6-Month LTV projection per customer: sum of retention%/100 * ARPU across months
    const perCohortLtv = retention.map(
      (r) => r.slice(0, MONTHS).reduce((s, v) => s + (v / 100) * ARPU, 0),
    );
    const avgLtv = perCohortLtv.reduce((a, b) => a + b, 0) / perCohortLtv.length;

    // NRR = average of month 5 NRR values across cohorts
    const nrrEnd = nrr.map((r) => r[MONTHS - 1] ?? 0);
    const avgNrr = nrrEnd.reduce((a, b) => a + b, 0) / nrrEnd.length;

    // Total customers retained today (last diagonal-ish: month 5 for oldest)
    const totalRetained = retention.reduce(
      (sum, r, i) => sum + (INITIAL_CUSTOMERS[i] * (r[MONTHS - 1] ?? 0)) / 100,
      0,
    );

    return { avgM1, avgLtv, avgNrr, totalRetained };
  }, [retention, nrr]);

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-[1400px] mx-auto">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
            Cohort Retention & NRR Heatmap
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Explore monthly cohorts, edit any cell to test scenarios, and watch summary metrics
            update live.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-lg border border-border bg-card p-1">
            <button
              onClick={() => setMode("retention")}
              className={cn(
                "px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
                mode === "retention"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              Customer Retention (%)
            </button>
            <button
              onClick={() => setMode("nrr")}
              className={cn(
                "px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
                mode === "nrr"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              Net Revenue Retention ($)
            </button>
          </div>
          <Button variant="outline" size="sm" onClick={reset} className="gap-1.5">
            <RotateCcw className="h-3.5 w-3.5" />
            Reset
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard
          icon={<Users className="h-4 w-4" />}
          label="Avg Month 1 Retention"
          value={`${summary.avgM1.toFixed(1)}%`}
          tone={summary.avgM1 >= 80 ? "good" : summary.avgM1 >= 65 ? "warn" : "bad"}
        />
        <SummaryCard
          icon={<DollarSign className="h-4 w-4" />}
          label="6-Month LTV / Customer"
          value={formatCurrency(summary.avgLtv)}
          tone="good"
        />
        <SummaryCard
          icon={<TrendingUp className="h-4 w-4" />}
          label="Net Revenue Retention"
          value={`${summary.avgNrr.toFixed(1)}%`}
          tone={summary.avgNrr >= 110 ? "good" : summary.avgNrr >= 100 ? "warn" : "bad"}
        />
        <SummaryCard
          icon={<Users className="h-4 w-4" />}
          label="Customers Retained (M5)"
          value={Math.round(summary.totalRetained).toLocaleString()}
          tone="good"
        />
      </div>

      {/* Heatmap */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {mode === "retention" ? "Customer Retention Heatmap" : "Net Revenue Retention Heatmap"}
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-separate border-spacing-1">
            <thead>
              <tr>
                <th className="text-left text-xs font-medium text-muted-foreground px-3 py-2 w-40">
                  Cohort
                </th>
                <th className="text-left text-xs font-medium text-muted-foreground px-3 py-2 w-24">
                  Customers
                </th>
                {Array.from({ length: MONTHS }).map((_, m) => (
                  <th
                    key={m}
                    className="text-center text-xs font-medium text-muted-foreground px-2 py-2"
                  >
                    Month {m}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {COHORT_LABELS.map((label, row) => (
                <tr key={label}>
                  <td className="text-sm font-medium px-3 py-1">{label}</td>
                  <td className="text-sm text-muted-foreground px-3 py-1">
                    {INITIAL_CUSTOMERS[row]}
                  </td>
                  {grid[row].map((val, col) => (
                    <td key={col} className="p-0">
                      <div
                        className={cn(
                          "rounded-md h-12 flex items-center justify-center transition-colors",
                          heatColor(val, mode),
                        )}
                      >
                        <input
                          type="number"
                          value={val}
                          onChange={(e) => updateCell(row, col, Number(e.target.value))}
                          className="w-full h-full bg-transparent text-center text-sm font-semibold outline-none focus:ring-2 focus:ring-primary/60 rounded-md"
                        />
                      </div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>

          {/* Legend */}
          <div className="flex flex-wrap items-center gap-3 mt-4 text-xs text-muted-foreground">
            <span>Heat scale:</span>
            <LegendSwatch className="bg-rose-500/40" label="< 30%" />
            <LegendSwatch className="bg-amber-500/50" label="30–45%" />
            <LegendSwatch className="bg-amber-400/50" label="45–60%" />
            <LegendSwatch className="bg-emerald-400/50" label="60–75%" />
            <LegendSwatch className="bg-emerald-500/60" label="75–90%" />
            <LegendSwatch className="bg-emerald-600/70" label="≥ 90%" />
            {mode === "nrr" && <span className="italic">(NRR scale shifted around 100%)</span>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone: "good" | "warn" | "bad";
}) {
  const toneClass =
    tone === "good"
      ? "text-emerald-500"
      : tone === "warn"
        ? "text-amber-500"
        : "text-rose-500";
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <span className="text-xs uppercase tracking-wider text-muted-foreground">{label}</span>
          <span className={cn("h-7 w-7 rounded-md bg-muted flex items-center justify-center", toneClass)}>
            {icon}
          </span>
        </div>
        <div className={cn("mt-2 text-2xl font-semibold tabular-nums", toneClass)}>{value}</div>
      </CardContent>
    </Card>
  );
}

function LegendSwatch({ className, label }: { className: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn("h-3 w-5 rounded", className)} />
      {label}
    </span>
  );
}

// Silence unused import warning if Input tree-shakes
void Input;
