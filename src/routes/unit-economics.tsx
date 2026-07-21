import { createFileRoute } from "@tanstack/react-router";
import { useUnitFlow } from "@/components/unitflow-provider";
import { computeMetrics, fmtCurrency, fmtMonths, paybackStatus, ratioStatus } from "@/lib/unitflow";
import { NumberField } from "@/components/number-field";
import { MetricCard } from "@/components/metric-card";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, RotateCcw, TrendingUp, Users, Timer } from "lucide-react";
import { LtvCacChart } from "@/components/charts/ltv-cac-chart";

export const Route = createFileRoute("/unit-economics")({
  head: () => ({
    meta: [
      { title: "Unit Economics — UnitFlow" },
      { name: "description", content: "Calculate LTV, CAC ratio, and payback period for your startup." },
    ],
  }),
  component: Page,
});

function Page() {
  const { inputs, setInputs, loadDemo, reset } = useUnitFlow();
  const m = computeMetrics(inputs);
  const rStatus = ratioStatus(m.ratio);
  const payStatus = paybackStatus(m.payback);

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-widest text-muted-foreground">Calculator</div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight mt-1">Unit Economics</h1>
          <p className="text-sm text-muted-foreground mt-1">
            The four inputs that decide whether your growth engine works.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={reset} className="gap-2">
            <RotateCcw className="h-4 w-4" /> Reset
          </Button>
          <Button variant="outline" size="sm" onClick={loadDemo} className="gap-2">
            <Sparkles className="h-4 w-4" /> Demo data
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Inputs</CardTitle>
            <CardDescription>All values in USD unless noted.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <NumberField
              label="ARPU (monthly)"
              value={inputs.arpu}
              prefix="$"
              tooltip="Average Revenue Per User per month."
              onChange={(v) => setInputs({ arpu: v })}
            />
            <NumberField
              label="CAC"
              value={inputs.cac}
              prefix="$"
              tooltip="Customer Acquisition Cost: fully-loaded sales & marketing spend to acquire one customer."
              onChange={(v) => setInputs({ cac: v })}
            />
            <NumberField
              label="Gross Margin"
              value={inputs.grossMargin}
              suffix="%"
              tooltip="Contribution margin per revenue dollar after variable costs (hosting, payment fees, support)."
              onChange={(v) => setInputs({ grossMargin: v })}
            />
            <NumberField
              label="Monthly Churn"
              value={inputs.churnRate}
              suffix="%"
              step={0.1}
              tooltip="Percentage of paying customers that cancel each month."
              onChange={(v) => setInputs({ churnRate: v })}
            />
          </CardContent>
        </Card>

        <div className="lg:col-span-3 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <MetricCard
              label="LTV"
              value={fmtCurrency(m.ltv)}
              icon={<TrendingUp className="h-4 w-4" />}
              tooltip="(ARPU × Gross Margin%) / Monthly Churn Rate"
              accent="success"
            />
            <MetricCard
              label="LTV : CAC"
              value={`${m.ratio.toFixed(2)}×`}
              status={rStatus}
              icon={<Users className="h-4 w-4" />}
              tooltip="Below 3× warning, 3–5× healthy, above 5× excellent."
              accent={rStatus.tone}
            />
            <MetricCard
              label="Payback"
              value={fmtMonths(m.payback)}
              status={payStatus}
              icon={<Timer className="h-4 w-4" />}
              tooltip="CAC / (ARPU × Gross Margin%)"
              accent={payStatus.tone}
            />
          </div>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">LTV vs. CAC</CardTitle>
              <CardDescription>You want LTV comfortably taller than CAC.</CardDescription>
            </CardHeader>
            <CardContent>
              <LtvCacChart ltv={m.ltv} cac={m.cac} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
