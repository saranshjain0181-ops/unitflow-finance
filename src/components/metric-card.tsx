import type { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Info } from "lucide-react";
import { cn } from "@/lib/utils";

type Tone = "success" | "warning" | "danger" | "muted";

const toneStyles: Record<Tone, string> = {
  success: "bg-success/15 text-success border-success/30",
  warning: "bg-warning/15 text-warning-foreground border-warning/40",
  danger: "bg-danger/15 text-danger border-danger/40",
  muted: "bg-muted text-muted-foreground border-border",
};

export function MetricCard({
  label,
  value,
  sub,
  status,
  icon,
  tooltip,
  accent,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  status?: { label: string; tone: Tone };
  icon?: ReactNode;
  tooltip?: string;
  accent?: Tone;
}) {
  return (
    <Card className="relative overflow-hidden">
      {accent && (
        <div
          className={cn(
            "absolute inset-x-0 top-0 h-0.5",
            accent === "success" && "bg-success",
            accent === "warning" && "bg-warning",
            accent === "danger" && "bg-danger",
            accent === "muted" && "bg-border",
          )}
        />
      )}
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
              {label}
            </span>
            {tooltip && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs text-xs">{tooltip}</TooltipContent>
              </Tooltip>
            )}
          </div>
          {icon && <div className="text-muted-foreground">{icon}</div>}
        </div>
        <div className="mt-3 flex items-end justify-between gap-2">
          <div className="text-2xl md:text-3xl font-semibold tracking-tight tabular-nums">
            {value}
          </div>
          {status && (
            <Badge
              variant="outline"
              className={cn("border text-[10px] font-medium", toneStyles[status.tone])}
            >
              {status.label}
            </Badge>
          )}
        </div>
        {sub && <div className="mt-2 text-xs text-muted-foreground">{sub}</div>}
      </CardContent>
    </Card>
  );
}
