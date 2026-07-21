import { createFileRoute } from "@tanstack/react-router";
import { useUnitFlow } from "@/components/unitflow-provider";
import {
  computeMetrics,
  DEFAULT_SCENARIO,
  fmtCurrency,
  fmtMonths,
  projectRunway,
  ratioStatus,
  runwayStatus,
} from "@/lib/unitflow";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { MetricCard } from "@/components/metric-card";
import { RunwayChart } from "@/components/charts/runway-chart";
import { LtvCacChart } from "@/components/charts/ltv-cac-chart";
import { Label } from "@/components/ui/label";
import { RotateCcw, TrendingUp, Wallet, Users, ArrowUpRight, ArrowDownRight } from "lucide-react";

export const Route = createFileRoute("/scenario")({
  head: () => ({
    meta: [
      { title: "Scenario Planner — UnitFlow" },
      { name: "description", content: "Simulate CAC, pricing, and churn improvements in real time." },
    ],
  }),
  component: Page,
});

function Page() {
  const { inputs, scenario, setScenario } = useUnitFlow();
  const base = computeMetrics(inputs);
  const projected = computeMetrics(inputs, scenario);
  const data = projectRunway(inputs, scenario);
  const baseData = projectRunway(inputs);
  const merged = data.map((d, i) => ({ ...d, baseCash: baseData[i]?.cash ?? 0 }));

  const rStatus = ratioStatus(projected.ratio);
  const runStatus = runwayStatus(projected.runway);

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-widest text-muted-foreground">
            What-if simulator
          </div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight mt-1">
            Scenario Planner
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Move the levers. See LTV:CAC and runway respond instantly.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={() => setScenario(DEFAULT_SCENARIO)}
        >
          <RotateCcw className="h-4 w-4" /> Reset scenario
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Levers</CardTitle>
            <CardDescription>Adjust to simulate operational improvements.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <SliderRow
              label="Reduce CAC"
              value={scenario.cacReduction}
              onChange={(v) => setScenario({ cacReduction: v })}
              suffix="%"
              max={80}
            />
            <SliderRow
              label="Increase price"
              value={scenario.priceIncrease}
              onChange={(v) => setScenario({ priceIncrease: v })}
              suffix="%"
              max={100}
            />
            <SliderRow
              label="Reduce churn"
              value={scenario.churnReduction}
              onChange={(v) => setScenario({ churnReduction: v })}
              suffix="%"
              max={90}
            />
          </CardContent>
        </Card>

        <div className="lg:col-span-3 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <DeltaCard
              label="LTV"
              base={base.ltv}
              projected={projected.ltv}
              format={fmtCurrency}
              icon={<TrendingUp className="h-4 w-4" />}
            />
            <MetricCard
              label="LTV : CAC"
              value={`${projected.ratio.toFixed(2)}×`}
              sub={`Base ${base.ratio.toFixed(2)}×`}
              status={rStatus}
              icon={<Users className="h-4 w-4" />}
              accent={rStatus.tone}
            />
            <MetricCard
              label="Runway"
              value={fmtMonths(projected.runway)}
              sub={`Base ${fmtMonths(base.runway)}`}
              status={runStatus}
              icon={<Wallet className="h-4 w-4" />}
              accent={runStatus.tone}
            />
          </div>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Projected runway vs. baseline</CardTitle>
              <CardDescription>Solid = scenario. Dashed baseline shown below.</CardDescription>
            </CardHeader>
            <CardContent>
              <RunwayChart data={merged} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">LTV vs. CAC (scenario)</CardTitle>
            </CardHeader>
            <CardContent>
              <LtvCacChart ltv={projected.ltv} cac={projected.cac} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function SliderRow({
  label,
  value,
  onChange,
  suffix,
  max,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  suffix?: string;
  max: number;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
          {label}
        </Label>
        <span className="text-sm font-medium tabular-nums">
          {value}
          {suffix}
        </span>
      </div>
      <Slider
        value={[value]}
        onValueChange={(v) => onChange(v[0])}
        min={0}
        max={max}
        step={1}
      />
    </div>
  );
}

function DeltaCard({
  label,
  base,
  projected,
  format,
  icon,
}: {
  label: string;
  base: number;
  projected: number;
  format: (n: number) => string;
  icon?: React.ReactNode;
}) {
  const delta = projected - base;
  const up = delta >= 0;
  return (
    <MetricCard
      label={label}
      value={format(projected)}
      icon={icon}
      sub={
        <span className={`inline-flex items-center gap-1 ${up ? "text-success" : "text-danger"}`}>
          {up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
          {format(Math.abs(delta))} vs base
        </span>
      }
      accent={up ? "success" : "warning"}
    />
  );
}
