import { createFileRoute } from "@tanstack/react-router";
import { useUnitFlow } from "@/components/unitflow-provider";
import { computeMetrics, fmtCurrency, fmtMonths, projectRunway, runwayStatus } from "@/lib/unitflow";
import { NumberField } from "@/components/number-field";
import { MetricCard } from "@/components/metric-card";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, Flame, Sparkles, RotateCcw, Wallet } from "lucide-react";
import { RunwayChart } from "@/components/charts/runway-chart";

export const Route = createFileRoute("/runway")({
  head: () => ({
    meta: [
      { title: "Runway & Burn — UnitFlow" },
      { name: "description", content: "Model net burn and cash runway for your startup." },
    ],
  }),
  component: Page,
});

function Page() {
  const { inputs, setInputs, loadDemo, reset } = useUnitFlow();
  const m = computeMetrics(inputs);
  const status = runwayStatus(m.runway);
  const data = projectRunway(inputs);
  const critical = isFinite(m.runway) && m.runway < 6;

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-widest text-muted-foreground">Calculator</div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight mt-1">Runway & Burn</h1>
          <p className="text-sm text-muted-foreground mt-1">
            How much time your cash actually buys you.
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

      {critical && (
        <Alert className="border-danger/40 bg-danger/10">
          <AlertTriangle className="h-4 w-4 text-danger" />
          <AlertTitle className="text-danger">Less than 6 months of runway</AlertTitle>
          <AlertDescription>
            Prioritize cost reductions, pricing changes, or a bridge round now.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Cash & operations</CardTitle>
            <CardDescription>Current balance and monthly flows.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <NumberField
              label="Cash in bank"
              value={inputs.cash}
              prefix="$"
              onChange={(v) => setInputs({ cash: v })}
            />
            <NumberField
              label="Monthly revenue"
              value={inputs.monthlyRevenue}
              prefix="$"
              onChange={(v) => setInputs({ monthlyRevenue: v })}
            />
            <NumberField
              label="Monthly expenses"
              value={inputs.monthlyExpenses}
              prefix="$"
              onChange={(v) => setInputs({ monthlyExpenses: v })}
            />
          </CardContent>
        </Card>

        <div className="lg:col-span-3 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <MetricCard
              label="Net burn"
              value={`${fmtCurrency(Math.max(0, m.netBurn))}/mo`}
              icon={<Flame className="h-4 w-4" />}
              tooltip="Monthly Expenses − Monthly Revenue. Negative means you're profitable."
              accent={m.netBurn > 0 ? "warning" : "success"}
            />
            <MetricCard
              label="Runway"
              value={fmtMonths(m.runway)}
              status={status}
              icon={<Wallet className="h-4 w-4" />}
              tooltip="Cash / Net Burn"
              accent={status.tone}
            />
            <MetricCard
              label="Cash balance"
              value={fmtCurrency(inputs.cash)}
              tooltip="Current cash on hand."
              accent="muted"
            />
          </div>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">12-month projection</CardTitle>
              <CardDescription>Assuming constant revenue and expenses.</CardDescription>
            </CardHeader>
            <CardContent>
              <RunwayChart data={data} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
