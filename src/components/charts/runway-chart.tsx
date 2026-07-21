import { Area, AreaChart, CartesianGrid, XAxis, YAxis, ReferenceLine } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { fmtCurrency } from "@/lib/unitflow";

export function RunwayChart({
  data,
}: {
  data: { month: string; cash: number }[];
}) {
  return (
    <ChartContainer
      config={{ cash: { label: "Cash", color: "var(--color-chart-1)" } }}
      className="h-[280px] w-full"
    >
      <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="cashFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-chart-1)" stopOpacity={0.5} />
            <stop offset="100%" stopColor="var(--color-chart-1)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke="var(--color-border)" />
        <XAxis dataKey="month" tickLine={false} axisLine={false} />
        <YAxis
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => fmtCurrency(Number(v))}
          width={60}
        />
        <ReferenceLine y={0} stroke="var(--color-danger)" strokeDasharray="4 4" />
        <ChartTooltip
          content={<ChartTooltipContent formatter={(v) => fmtCurrency(Number(v))} />}
        />
        <Area
          type="monotone"
          dataKey="cash"
          stroke="var(--color-chart-1)"
          strokeWidth={2.5}
          fill="url(#cashFill)"
        />
      </AreaChart>
    </ChartContainer>
  );
}
