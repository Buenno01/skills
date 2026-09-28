import * as React from "react";
import { cn } from "@/lib/utils";
import { Card } from "@/ui/card";

/** Single metric with label, big value, optional delta (positive/negative colored) and footnote. */
export function KpiCard({ label, value, delta, deltaLabel, note, className }: { label: string; value: React.ReactNode; delta?: number; deltaLabel?: string; note?: string; className?: string }) {
  const sign = delta === undefined ? null : delta > 0 ? "+" : "";
  return (
    <Card className={cn("gap-1 py-4", className)}>
      <div className="px-5 text-sm text-muted-foreground">{label}</div>
      <div className="px-5 text-3xl font-semibold tracking-tight tabular-nums">{value}</div>
      {(delta !== undefined || note) && (
        <div className="px-5 text-xs flex items-center gap-2">
          {delta !== undefined && <span className={cn("tabular-nums font-medium", delta > 0 ? "text-success" : delta < 0 ? "text-destructive" : "text-muted-foreground")}>{sign}{delta}{deltaLabel ?? "%"}</span>}
          {note && <span className="text-muted-foreground">{note}</span>}
        </div>
      )}
    </Card>
  );
}
