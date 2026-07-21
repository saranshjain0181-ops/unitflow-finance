import { createFileRoute, Link } from "@tanstack/react-router";
import { useUnitFlow } from "@/components/unitflow-provider";
import { computeMetrics, fmtCurrency, fmtMonths, projectRunway, ratioStatus, runwayStatus, paybackStatus } from "@/lib/unitflow";
import { MetricCard } from "@/components/metric-card";
import { RunwayChart } from "@/components/charts/runway-chart";
import { LtvCacChart } from "@/components/charts/ltv-cac-chart";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Sparkles, TrendingUp, Wallet, Users, AlertTriangle, ArrowRight, Flame, Timer } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Dashboard,
});

function Dashboard() {
  const { inputs, scenario, loadDemo } = useUnitFlow();
  const m = computeMetrics(inputs, scenario);
  const rStatus = ratioStatus(m.ratio);
  const runStatus = runwayStatus(m.runway);
  const payStatus = paybackStatus(m.payback);
  const runwayData = projectRunway(inputs, scenario);
  const critical = isFinite(m.runway) && m.runway < 6;

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-widest text-muted-foreground">Overview</div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight mt-1">
            Financial health at a glance
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Your live unit economics, burn, and runway — updated as you edit inputs.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={loadDemo} className="gap-2">
            <Sparkles className="h-4 w-4" />
            Load demo data
          </Button>
          <Button asChild size="sm" className="gap-2">
            <Link to="/unit-economics">
              Edit inputs <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>

      {critical && (
        <Alert className="border-danger/40 bg-danger/10">
          <AlertTriangle className="h-4 w-4 text-danger" />
          <AlertTitle className="text-danger">Critical runway warning</AlertTitle>
          <AlertDescription>
            You have less than 6 months of runway at the current burn rate. Consider cutting costs or raising capital.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="LTV"
          value={fmtCurrency(m.ltv)}
          icon={<TrendingUp className="h-4 w-4" />}
          sub={`ARPU × Margin ÷ Churn`}
          tooltip="Customer Lifetime Value = (ARPU × Gross Margin%) / Monthly Churn Rate. The total gross profit expected from a customer over their lifetime."
          accent="success"
        />
        <MetricCard
          label="LTV : CAC"
          value={`${m.ratio.toFixed(2)}×`}
          status={rStatus}
          icon={<Users className="h-4 w-4" />}
          sub="Healthy 3× – 5×, Excellent > 5×"
          tooltip="Ratio of Lifetime Value to Customer Acquisition Cost. Below 3× signals inefficient growth; above 5× may signal underinvestment in acquisition."
          accent={rStatus.tone}
        />
        <MetricCard
          label="CAC Payback"
          value={fmtMonths(m.payback)}
          status={payStatus}
          icon={<Timer className="h-4 w-4" />}
          sub="Months to recover CAC"
          tooltip="CAC / (ARPU × Gross Margin%). The number of months required to earn back what you paid to acquire a customer."
          accent={payStatus.tone}
        />
        <MetricCard
          label="Runway"
          value={fmtMonths(m.runway)}
          status={runStatus}
          icon={<Wallet className="h-4 w-4" />}
          sub={`Net burn ${fmtCurrency(Math.max(0, m.netBurn))}/mo`}
          tooltip="Cash / (Monthly Expenses − Monthly Revenue). How long you can operate at your current net burn."
          accent={runStatus.tone}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <Card className="lg:col-span-3">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">12-month cash runway</CardTitle>
                <CardDescription>Projected cash balance at today's net burn</CardDescription>
              </div>
              <Flame className="h-4 w-4 text-danger" />
            </div>
          </CardHeader>
          <CardContent>
            <RunwayChart data={runwayData} />
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">LTV vs. CAC</CardTitle>
            <CardDescription>Unit economics balance</CardDescription>
          </CardHeader>
          <CardContent>
            <LtvCacChart ltv={m.ltv} cac={m.cac} />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <QuickLink to="/unit-economics" title="Unit Economics" desc="Tune ARPU, CAC, margin & churn." />
        <QuickLink to="/runway" title="Runway & Burn" desc="Model cash, revenue, and expenses." />
        <QuickLink to="/scenario" title="Scenario Planner" desc="Simulate what-if adjustments." />
      </div>
    </div>
  );
}

function QuickLink({ to, title, desc }: { to: string; title: string; desc: string }) {
  return (
    <Link
      to={to}
      className="group rounded-lg border border-border bg-card p-4 hover:border-primary/40 hover:bg-accent/40 transition-colors flex items-center justify-between"
    >
      <div>
        <div className="font-medium">{title}</div>
        <div className="text-xs text-muted-foreground mt-0.5">{desc}</div>
      </div>
      <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
    </Link>
  );
}
