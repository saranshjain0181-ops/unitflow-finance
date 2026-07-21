export type Inputs = {
  arpu: number;
  cac: number;
  grossMargin: number; // 0-100
  churnRate: number; // 0-100 monthly
  cash: number;
  monthlyRevenue: number;
  monthlyExpenses: number;
};

export type Scenario = {
  cacReduction: number; // %
  priceIncrease: number; // %
  churnReduction: number; // %
};

export const DEMO_INPUTS: Inputs = {
  arpu: 120,
  cac: 380,
  grossMargin: 75,
  churnRate: 4,
  cash: 850000,
  monthlyRevenue: 62000,
  monthlyExpenses: 118000,
};

export const DEFAULT_INPUTS: Inputs = {
  arpu: 0,
  cac: 0,
  grossMargin: 0,
  churnRate: 0,
  cash: 0,
  monthlyRevenue: 0,
  monthlyExpenses: 0,
};

export const DEFAULT_SCENARIO: Scenario = {
  cacReduction: 0,
  priceIncrease: 0,
  churnReduction: 0,
};

export function computeMetrics(i: Inputs, s: Scenario = DEFAULT_SCENARIO) {
  const arpu = i.arpu * (1 + s.priceIncrease / 100);
  const cac = i.cac * (1 - s.cacReduction / 100);
  const gm = i.grossMargin / 100;
  const churn = Math.max(0.0001, (i.churnRate * (1 - s.churnReduction / 100)) / 100);

  const contribution = arpu * gm;
  const ltv = churn > 0 ? contribution / churn : 0;
  const ratio = cac > 0 ? ltv / cac : 0;
  const payback = contribution > 0 ? cac / contribution : 0;

  const revenue = i.monthlyRevenue * (1 + s.priceIncrease / 100);
  const netBurn = i.monthlyExpenses - revenue;
  const runway = netBurn > 0 ? i.cash / netBurn : Infinity;

  return {
    arpu,
    cac,
    ltv,
    ratio,
    payback,
    contribution,
    netBurn,
    runway,
    revenue,
    expenses: i.monthlyExpenses,
    cash: i.cash,
  };
}

export function ratioStatus(ratio: number) {
  if (ratio <= 0) return { label: "No data", tone: "muted" as const };
  if (ratio < 3) return { label: "Action needed", tone: "warning" as const };
  if (ratio <= 5) return { label: "Healthy", tone: "success" as const };
  return { label: "Excellent", tone: "success" as const };
}

export function runwayStatus(months: number) {
  if (!isFinite(months)) return { label: "Profitable", tone: "success" as const };
  if (months <= 0) return { label: "Critical", tone: "danger" as const };
  if (months < 6) return { label: "Critical", tone: "danger" as const };
  if (months < 12) return { label: "Watch", tone: "warning" as const };
  return { label: "Healthy", tone: "success" as const };
}

export function paybackStatus(months: number) {
  if (months <= 0) return { label: "No data", tone: "muted" as const };
  if (months <= 12) return { label: "Healthy", tone: "success" as const };
  if (months <= 18) return { label: "Watch", tone: "warning" as const };
  return { label: "Action needed", tone: "danger" as const };
}

export function projectRunway(i: Inputs, s: Scenario = DEFAULT_SCENARIO) {
  const m = computeMetrics(i, s);
  const arr: { month: string; cash: number; revenue: number; expenses: number }[] = [];
  let cash = i.cash;
  const revenue = m.revenue;
  const expenses = m.expenses;
  for (let k = 0; k <= 12; k++) {
    arr.push({
      month: `M${k}`,
      cash: Math.max(0, Math.round(cash)),
      revenue: Math.round(revenue),
      expenses: Math.round(expenses),
    });
    cash -= expenses - revenue;
  }
  return arr;
}

export function fmtCurrency(n: number) {
  if (!isFinite(n)) return "∞";
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(0)}`;
}

export function fmtMonths(n: number) {
  if (!isFinite(n)) return "∞";
  if (n <= 0) return "0 mo";
  return `${n.toFixed(1)} mo`;
}
