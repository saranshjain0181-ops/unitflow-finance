import { createFileRoute } from "@tanstack/react-router";
import { useUnitFlow } from "@/components/unitflow-provider";
import { computeMetrics, fmtCurrency, fmtMonths, ratioStatus, runwayStatus, paybackStatus } from "@/lib/unitflow";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, FileText, Table } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/export")({
  head: () => ({
    meta: [
      { title: "Export — UnitFlow" },
      { name: "description", content: "Download your financial summary as CSV or PDF." },
    ],
  }),
  component: Page,
});

function Page() {
  const { inputs, scenario } = useUnitFlow();
  const m = computeMetrics(inputs, scenario);
  const rStatus = ratioStatus(m.ratio);
  const runStatus = runwayStatus(m.runway);
  const payStatus = paybackStatus(m.payback);

  const rows = [
    ["Metric", "Value", "Status"],
    ["ARPU", `$${inputs.arpu.toFixed(2)}`, ""],
    ["CAC", `$${inputs.cac.toFixed(2)}`, ""],
    ["Gross Margin %", `${inputs.grossMargin}%`, ""],
    ["Monthly Churn %", `${inputs.churnRate}%`, ""],
    ["LTV", fmtCurrency(m.ltv), ""],
    ["LTV : CAC", `${m.ratio.toFixed(2)}x`, rStatus.label],
    ["CAC Payback", fmtMonths(m.payback), payStatus.label],
    ["Cash in bank", fmtCurrency(inputs.cash), ""],
    ["Monthly revenue", fmtCurrency(inputs.monthlyRevenue), ""],
    ["Monthly expenses", fmtCurrency(inputs.monthlyExpenses), ""],
    ["Net burn", `${fmtCurrency(Math.max(0, m.netBurn))}/mo`, ""],
    ["Runway", fmtMonths(m.runway), runStatus.label],
  ];

  const downloadCsv = () => {
    const csv = rows
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    triggerDownload(csv, "unitflow-summary.csv", "text/csv");
    toast.success("CSV downloaded");
  };

  const downloadPdf = () => {
    const html = buildReportHtml(rows, { rStatus, runStatus, payStatus });
    const win = window.open("", "_blank");
    if (!win) {
      toast.error("Pop-up blocked. Allow pop-ups to print the report.");
      return;
    }
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 300);
    toast.success("Report opened — use your browser's Save as PDF");
  };

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-6">
      <div>
        <div className="text-xs uppercase tracking-widest text-muted-foreground">Deliverables</div>
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight mt-1">
          Export financial summary
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Grab a clean snapshot to share with your board, investors, or team.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="hover:border-primary/40 transition-colors">
          <CardHeader>
            <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <FileText className="h-5 w-5" />
            </div>
            <CardTitle className="text-base mt-2">PDF report</CardTitle>
            <CardDescription>Formatted, print-ready one-pager.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={downloadPdf} className="gap-2">
              <Download className="h-4 w-4" /> Generate PDF
            </Button>
          </CardContent>
        </Card>
        <Card className="hover:border-primary/40 transition-colors">
          <CardHeader>
            <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <Table className="h-5 w-5" />
            </div>
            <CardTitle className="text-base mt-2">CSV summary</CardTitle>
            <CardDescription>Import into Sheets, Excel, or Notion.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={downloadCsv} variant="outline" className="gap-2">
              <Download className="h-4 w-4" /> Download CSV
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Preview</CardTitle>
          <CardDescription>The data included in your export.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-md border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  {rows[0].map((h) => (
                    <th key={h} className="text-left px-4 py-2 font-medium text-muted-foreground">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.slice(1).map((r, i) => (
                  <tr key={i} className="border-t border-border">
                    {r.map((c, j) => (
                      <td key={j} className="px-4 py-2 tabular-nums">
                        {c}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function triggerDownload(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function buildReportHtml(
  rows: string[][],
  s: { rStatus: { label: string }; runStatus: { label: string }; payStatus: { label: string } },
) {
  const body = rows
    .slice(1)
    .map(
      (r) =>
        `<tr><td>${r[0]}</td><td style="text-align:right;font-variant-numeric:tabular-nums">${r[1]}</td><td style="color:#64748b">${r[2]}</td></tr>`,
    )
    .join("");
  const date = new Date().toLocaleDateString();
  return `<!doctype html><html><head><meta charset="utf-8"><title>UnitFlow Financial Summary</title>
<style>
  body{font-family:-apple-system,Inter,Segoe UI,sans-serif;color:#0f172a;padding:48px;max-width:720px;margin:0 auto}
  h1{font-size:22px;margin:0 0 4px}
  .sub{color:#64748b;font-size:12px;margin-bottom:24px}
  table{width:100%;border-collapse:collapse;font-size:13px}
  th,td{padding:8px 10px;border-bottom:1px solid #e2e8f0;text-align:left}
  .badges{display:flex;gap:8px;margin:16px 0 24px}
  .badge{padding:4px 10px;border-radius:999px;font-size:11px;background:#f1f5f9;color:#0f172a}
  .footer{margin-top:32px;font-size:11px;color:#94a3b8}
</style></head><body>
<h1>UnitFlow — Financial Summary</h1>
<div class="sub">Generated ${date}</div>
<div class="badges">
  <span class="badge">LTV:CAC — ${s.rStatus.label}</span>
  <span class="badge">Payback — ${s.payStatus.label}</span>
  <span class="badge">Runway — ${s.runStatus.label}</span>
</div>
<table><thead><tr><th>Metric</th><th style="text-align:right">Value</th><th>Status</th></tr></thead>
<tbody>${body}</tbody></table>
<div class="footer">Generated by UnitFlow • Unit economics & runway engine</div>
</body></html>`;
}
