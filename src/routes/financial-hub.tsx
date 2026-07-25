import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, useCallback, useRef, type DragEvent } from "react";
import * as XLSX from "xlsx";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UploadCloud, Download, FileSpreadsheet, CheckCircle2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/financial-hub")({
  head: () => ({
    meta: [
      { title: "Financial Data Hub — UnitFlow" },
      {
        name: "description",
        content:
          "Ingest financial data and model a P&L waterfall with live gross, EBITDA, and net profit margins.",
      },
      { property: "og:title", content: "Financial Data Hub — UnitFlow" },
      {
        property: "og:description",
        content: "P&L waterfall builder with live margin calculations for founders.",
      },
    ],
  }),
  component: Page,
});

type PnL = {
  grossSales: number;
  discounts: number;
  cogs: number;
  sm: number;
  rd: number;
  ga: number;
  da: number;
  interestTax: number;
};

const PNL_FIELDS: { key: keyof PnL; label: string }[] = [
  { key: "grossSales", label: "Gross Sales" },
  { key: "discounts", label: "Discounts & Returns" },
  { key: "cogs", label: "COGS" },
  { key: "sm", label: "Sales & Marketing" },
  { key: "rd", label: "R&D" },
  { key: "ga", label: "G&A" },
  { key: "da", label: "Depreciation & Amortization" },
  { key: "interestTax", label: "Interest & Taxes" },
];

const IGNORE = "__ignore__";

const DEFAULT_PNL: PnL = {
  grossSales: 1250000,
  discounts: 85000,
  cogs: 340000,
  sm: 210000,
  rd: 180000,
  ga: 120000,
  da: 45000,
  interestTax: 60000,
};

const usd = (n: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(isFinite(n) ? n : 0);

const pct = (n: number) => (isFinite(n) ? `${n.toFixed(1)}%` : "—");

type ParsedRow = { label: string; amount: number; raw: string };

// Fuzzy match a text label to a PnL field key.
function guessField(label: string): keyof PnL | typeof IGNORE {
  const l = label.toLowerCase().replace(/[^a-z0-9]/g, "");
  const rules: [RegExp, keyof PnL][] = [
    [/gross(sales|revenue)|totalrevenue|revenue$/, "grossSales"],
    [/discount|return|refund|allowance/, "discounts"],
    [/cogs|costofgoods|costofsales|costofrevenue/, "cogs"],
    [/salesmarketing|s&m|marketing|sales$/, "sm"],
    [/r&d|research|rnd/, "rd"],
    [/g&a|generaladmin|admin|overhead/, "ga"],
    [/depreciation|amortization|d&a/, "da"],
    [/interest|tax/, "interestTax"],
  ];
  for (const [re, key] of rules) if (re.test(l)) return key;
  return IGNORE;
}

function parseAmount(v: unknown): number {
  if (typeof v === "number") return v;
  if (v == null) return 0;
  const s = String(v).trim();
  if (!s) return 0;
  const neg = /^\(.*\)$/.test(s);
  const cleaned = s.replace(/[(),$\s]/g, "").replace(/[^0-9.\-]/g, "");
  const n = parseFloat(cleaned);
  if (!isFinite(n)) return 0;
  return neg ? -Math.abs(n) : n;
}

function parseSheet(wb: XLSX.WorkBook, sheetName: string): ParsedRow[] {
  const sheet = wb.Sheets[sheetName];
  if (!sheet) return [];
  const aoa = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, blankrows: false });
  const rows: ParsedRow[] = [];
  const start =
    aoa.length && typeof aoa[0]?.[0] === "string" && /item|label|account|name/i.test(String(aoa[0][0]))
      ? 1
      : 0;
  for (let i = start; i < aoa.length; i++) {
    const row = aoa[i];
    if (!row || row.length === 0) continue;
    const label = String(row[0] ?? "").trim();
    if (!label) continue;
    let amount = 0;
    let raw = "";
    for (let j = 1; j < row.length; j++) {
      if (row[j] != null && String(row[j]).trim() !== "") {
        amount = parseAmount(row[j]);
        raw = String(row[j]);
        break;
      }
    }
    rows.push({ label, amount, raw });
  }
  return rows;
}

async function readWorkbook(file: File): Promise<XLSX.WorkBook> {
  const buf = await file.arrayBuffer();
  return XLSX.read(buf, { type: "array" });
}


function Page() {
  const [manual, setManual] = useState(true);
  const [pnl, setPnl] = useState<PnL>(DEFAULT_PNL);
  const [dragOver, setDragOver] = useState(false);
  const [preview, setPreview] = useState<{
    fileName: string;
    workbook: XLSX.WorkBook;
    sheetName: string;
    rows: ParsedRow[];
    mapping: (keyof PnL | typeof IGNORE)[];
  } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const m = useMemo(() => {
    const netSales = pnl.grossSales - pnl.discounts;
    const grossProfit = netSales - pnl.cogs;
    const opex = pnl.sm + pnl.rd + pnl.ga;
    const ebitda = grossProfit - opex;
    const ebit = ebitda - pnl.da;
    const netProfit = ebit - pnl.interestTax;
    const gm = netSales > 0 ? (grossProfit / netSales) * 100 : 0;
    const em = netSales > 0 ? (ebitda / netSales) * 100 : 0;
    const nm = netSales > 0 ? (netProfit / netSales) * 100 : 0;
    return { netSales, grossProfit, opex, ebitda, ebit, netProfit, gm, em, nm };
  }, [pnl]);

  const update = (k: keyof PnL) => (v: string) =>
    setPnl((p) => ({ ...p, [k]: parseFloat(v) || 0 }));

  const selectSheet = useCallback(
    (workbook: XLSX.WorkBook, fileName: string, sheetName: string) => {
      const rows = parseSheet(workbook, sheetName);
      if (!rows.length) {
        toast.error("No rows found on this sheet", {
          description: `"${sheetName}" appears empty.`,
        });
      }
      const mapping = rows.map((r) => guessField(r.label));
      setPreview({ fileName, workbook, sheetName, rows, mapping });
    },
    [],
  );

  const handleFile = useCallback(
    async (file: File) => {
      try {
        const workbook = await readWorkbook(file);
        if (!workbook.SheetNames.length) {
          toast.error("No sheets found in file");
          return;
        }
        selectSheet(workbook, file.name, workbook.SheetNames[0]);
      } catch (err) {
        toast.error("Failed to parse file", {
          description: err instanceof Error ? err.message : "Unsupported format.",
        });
      }
    },
    [selectSheet],
  );


  const onDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  const confirmImport = () => {
    if (!preview) return;
    const next: PnL = { ...pnl };
    // zero out any mapped field first so multi-row totals sum correctly
    const touched = new Set<keyof PnL>();
    preview.mapping.forEach((k) => {
      if (k !== IGNORE) touched.add(k);
    });
    touched.forEach((k) => {
      next[k] = 0;
    });
    let imported = 0;
    preview.rows.forEach((r, i) => {
      const k = preview.mapping[i];
      if (k === IGNORE) return;
      next[k] += Math.abs(r.amount);
      imported++;
    });
    setPnl(next);
    setManual(true);
    setPreview(null);
    toast.success(`Imported ${imported} rows`, {
      description: `From ${preview.fileName}`,
    });
  };

  const downloadTemplate = () => {
    const csv =
      "Line Item,Amount (USD)\nGross Sales,0\nDiscounts & Returns,0\nCOGS,0\nSales & Marketing,0\nR&D,0\nG&A,0\nDepreciation & Amortization,0\nInterest & Taxes,0\n";
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "unitflow-pnl-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const mappedCount = preview?.mapping.filter((k) => k !== IGNORE).length ?? 0;

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-[1400px] mx-auto">
      <div>
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Financial Data Hub</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Import your financials or build a P&amp;L waterfall by hand.
        </p>
      </div>

      {/* Dropzone */}
      <Card>
        <CardContent className="p-4 md:p-6 space-y-4">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            onClick={() => inputRef.current?.click()}
            className={cn(
              "border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer",
              dragOver
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/50 bg-muted/30",
            )}
          >
            <UploadCloud className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm font-medium">Drag &amp; drop CSV or Excel file here</p>
            <p className="text-xs text-muted-foreground mt-1">
              Supports .csv, .xlsx, .xls — click to browse
            </p>
            <input
              ref={inputRef}
              type="file"
              accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
                e.target.value = "";
              }}
            />
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <Button variant="outline" size="sm" onClick={downloadTemplate}>
              <Download className="h-4 w-4 mr-2" />
              Download Standard P&amp;L Template
            </Button>
            <div className="flex items-center gap-2">
              <Switch id="manual" checked={manual} onCheckedChange={setManual} />
              <Label htmlFor="manual" className="text-sm cursor-pointer">
                Manual Entry Mode
              </Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {manual && (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
          {/* P&L Waterfall Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5 text-primary" />
                P&amp;L Waterfall
              </CardTitle>
              <CardDescription>Auto-calculated subtotals update as you type.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Line Item</TableHead>
                    <TableHead className="w-[220px] text-right">Amount (USD)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <EditableRow label="Gross Sales" value={pnl.grossSales} onChange={update("grossSales")} />
                  <EditableRow
                    label="(-) Discounts & Returns"
                    value={pnl.discounts}
                    onChange={update("discounts")}
                    negative
                  />
                  <SubtotalRow label="= Net Sales" value={m.netSales} />
                  <EditableRow
                    label="(-) Cost of Goods Sold (COGS)"
                    value={pnl.cogs}
                    onChange={update("cogs")}
                    negative
                  />
                  <SubtotalRow label="= Gross Profit" value={m.grossProfit} />
                  <EditableRow
                    label="(-) Sales & Marketing"
                    value={pnl.sm}
                    onChange={update("sm")}
                    negative
                    indent
                  />
                  <EditableRow
                    label="(-) Research & Development"
                    value={pnl.rd}
                    onChange={update("rd")}
                    negative
                    indent
                  />
                  <EditableRow
                    label="(-) General & Administrative"
                    value={pnl.ga}
                    onChange={update("ga")}
                    negative
                    indent
                  />
                  <TableRow className="bg-primary/10 hover:bg-primary/15">
                    <TableCell className="font-bold">= EBITDA</TableCell>
                    <TableCell className="text-right font-bold tabular-nums">
                      {usd(m.ebitda)}
                    </TableCell>
                  </TableRow>
                  <EditableRow
                    label="(-) Depreciation & Amortization"
                    value={pnl.da}
                    onChange={update("da")}
                    negative
                  />
                  <SubtotalRow label="= EBIT" value={m.ebit} />
                  <EditableRow
                    label="(-) Interest & Taxes"
                    value={pnl.interestTax}
                    onChange={update("interestTax")}
                    negative
                  />
                  <TableRow className="border-t-2">
                    <TableCell
                      className={cn(
                        "font-bold text-base",
                        m.netProfit >= 0 ? "text-emerald-500" : "text-red-500",
                      )}
                    >
                      = Net Profit (PAT)
                    </TableCell>
                    <TableCell
                      className={cn(
                        "text-right font-bold text-base tabular-nums",
                        m.netProfit >= 0 ? "text-emerald-500" : "text-red-500",
                      )}
                    >
                      {usd(m.netProfit)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Key Margins */}
          <div className="space-y-4 lg:sticky lg:top-4 lg:self-start">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Key Margins</CardTitle>
                <CardDescription>Live from your P&amp;L inputs.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <MarginRow label="Gross Margin" value={m.gm} good={40} />
                <MarginRow label="EBITDA Margin" value={m.em} good={15} />
                <MarginRow label="Net Profit Margin" value={m.nm} good={10} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Snapshot</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <SnapRow label="Net Sales" value={usd(m.netSales)} />
                <SnapRow label="Gross Profit" value={usd(m.grossProfit)} />
                <SnapRow label="Total OpEx" value={usd(m.opex)} />
                <SnapRow label="EBITDA" value={usd(m.ebitda)} />
                <SnapRow label="Net Profit" value={usd(m.netProfit)} strong />
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Preview Dialog */}
      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Preview Import</DialogTitle>
            <DialogDescription>
              {preview?.fileName} — review parsed rows and mapping before importing.
              We auto-matched labels to your P&amp;L structure; adjust as needed.
            </DialogDescription>
          </DialogHeader>
          {preview && (
            <>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                {preview.workbook.SheetNames.length > 1 ? (
                  <div className="flex items-center gap-2">
                    <Label className="text-xs text-muted-foreground">Worksheet</Label>
                    <Select
                      value={preview.sheetName}
                      onValueChange={(v) =>
                        selectSheet(preview.workbook, preview.fileName, v)
                      }
                    >
                      <SelectTrigger className="h-8 w-[220px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {preview.workbook.SheetNames.map((n) => (
                          <SelectItem key={n} value={n}>
                            {n}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Badge variant="secondary" className="text-[10px]">
                      {preview.workbook.SheetNames.length} sheets
                    </Badge>
                  </div>
                ) : (
                  <div className="text-xs text-muted-foreground">
                    Sheet: <span className="font-medium text-foreground">{preview.sheetName}</span>
                  </div>
                )}
                <div className="flex items-center gap-3 text-xs">
                  <Badge variant="outline" className="border-emerald-500/30 text-emerald-500 bg-emerald-500/10">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    {mappedCount} mapped
                  </Badge>
                  <Badge variant="outline" className="border-muted-foreground/30 text-muted-foreground">
                    <XCircle className="h-3 w-3 mr-1" />
                    {preview.rows.length - mappedCount} ignored
                  </Badge>
                </div>
              </div>

              <div className="max-h-[420px] overflow-y-auto border rounded-md">
                <Table>
                  <TableHeader className="sticky top-0 bg-background z-10">
                    <TableRow>
                      <TableHead>Source Label</TableHead>
                      <TableHead className="w-[140px] text-right">Amount</TableHead>
                      <TableHead className="w-[210px]">Map To</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {preview.rows.map((r, i) => (
                      <TableRow key={i}>
                        <TableCell className="text-sm">{r.label}</TableCell>
                        <TableCell className="text-right tabular-nums text-sm">
                          {usd(r.amount)}
                        </TableCell>
                        <TableCell>
                          <Select
                            value={preview.mapping[i]}
                            onValueChange={(v) =>
                              setPreview((p) =>
                                p
                                  ? {
                                      ...p,
                                      mapping: p.mapping.map((x, idx) =>
                                        idx === i ? (v as keyof PnL | typeof IGNORE) : x,
                                      ),
                                    }
                                  : p,
                              )
                            }
                          >
                            <SelectTrigger className="h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value={IGNORE}>Ignore</SelectItem>
                              {PNL_FIELDS.map((f) => (
                                <SelectItem key={f.key} value={f.key}>
                                  {f.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreview(null)}>
              Cancel
            </Button>
            <Button onClick={confirmImport} disabled={mappedCount === 0}>
              Import {mappedCount} rows
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function EditableRow({
  label,
  value,
  onChange,
  negative,
  indent,
}: {
  label: string;
  value: number;
  onChange: (v: string) => void;
  negative?: boolean;
  indent?: boolean;
}) {
  return (
    <TableRow>
      <TableCell className={cn("text-sm", indent && "pl-8", negative && "text-muted-foreground")}>
        {label}
      </TableCell>
      <TableCell className="text-right">
        <Input
          type="number"
          inputMode="decimal"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-8 text-right tabular-nums"
        />
      </TableCell>
    </TableRow>
  );
}

function SubtotalRow({ label, value }: { label: string; value: number }) {
  return (
    <TableRow className="bg-muted/40">
      <TableCell className="font-bold">{label}</TableCell>
      <TableCell className="text-right font-bold tabular-nums">{usd(value)}</TableCell>
    </TableRow>
  );
}

function MarginRow({ label, value, good }: { label: string; value: number; good: number }) {
  const tone =
    value >= good
      ? "bg-emerald-500/15 text-emerald-500 border-emerald-500/30"
      : value >= good / 2
        ? "bg-amber-500/15 text-amber-500 border-amber-500/30"
        : "bg-red-500/15 text-red-500 border-red-500/30";
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
          {label}
        </span>
        <Badge variant="outline" className={cn("tabular-nums", tone)}>
          {pct(value)}
        </Badge>
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className={cn(
            "h-full transition-all",
            value >= good
              ? "bg-emerald-500"
              : value >= good / 2
                ? "bg-amber-500"
                : "bg-red-500",
          )}
          style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
        />
      </div>
    </div>
  );
}

function SnapRow({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn("tabular-nums", strong && "font-semibold")}>{value}</span>
    </div>
  );
}
