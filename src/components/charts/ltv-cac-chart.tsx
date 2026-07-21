import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { fmtCurrency } from "@/lib/unitflow";

export function LtvCacChart({ ltv, cac }: { ltv: number; cac: number }) {
  const data = [
    { name: "CAC", value: Math.max(0, Math.round(cac)), fill: "var(--color-chart-2)" },
    { name: "LTV", value: Math.max(0, Math.round(ltv)), fill: "var(--color-chart-1)" },
  ];
  return (
    <ChartContainer
      config={{
        value: { label: "USD" },
      }}
      className="h-[260px] w-full"
    >
      <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="var(--color-border)" />
        <XAxis dataKey="name" tickLine={false} axisLine={false} />
        <YAxis
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => fmtCurrency(Number(v))}
          width={60}
        />
        <ChartTooltip
          content={<ChartTooltipContent formatter={(v) => fmtCurrency(Number(v))} />}
        />
        <Bar dataKey="value" radius={[8, 8, 0, 0]} />
      </BarChart>
    </ChartContainer>
  );
}
